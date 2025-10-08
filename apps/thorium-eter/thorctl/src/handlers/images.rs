use thorium::{client::Thorium, models::Image, Error};

use crate::args::Args;
use crate::args::{
    images::{DescribeImages, GetImages, Images},
    DescribeCommand,
};

use super::update;
use crate::utils;

mod bans;
mod edit;
mod notifications;

struct GetImagesLine;

impl GetImagesLine {
    /// Print this log lines header
    pub fn header() {
        println!(
            "{:<30} | {:<20} | {:<10} | {:<50}",
            "IMAGE NAME", "GROUP", "SCALER", "DESCRIPTION",
        );
        println!("{:-<31}+{:-<22}+{:-<12}+{:-<50}", "", "", "", "");
    }

    /// Print an image's info
    ///
    /// # Arguments
    ///
    /// * `image` - The image to print
    pub fn print_image(image: &Image) {
        println!(
            "{:<30} | {:<20} | {:<10} | {}",
            image.name,
            image.group,
            image.scaler.as_str(),
            image.description.as_ref().unwrap_or(&"-".to_string())
        );
    }
}

/// Get image info from Thorium
///
/// # Arguments
///
/// * `thorium` - The Thorium client
/// * `cmd` - The image get command to execute
async fn get(thorium: Thorium, cmd: &GetImages) -> Result<(), Error> {
    GetImagesLine::header();
    // get the current user's groups if no groups were specified
    let groups = if cmd.groups.is_empty() {
        utils::groups::get_all_groups(&thorium).await?
    } else {
        cmd.groups.clone()
    };
    // get image cursors for all groups specified
    let image_cursors = groups.iter().map(|group| {
        thorium
            .images
            .list(group)
            .limit(cmd.limit)
            .page(cmd.page_size)
            .details()
    });
    // retrieve the images in each cursor until we've reached our limit
    // or all cursors are exhausted
    let mut images: Vec<Image> = Vec::new();
    for mut cursor in image_cursors {
        while !cursor.exhausted {
            cursor.next().await?;
            // remove images with a non-matching scaler
            if let Some(scaler) = &cmd.scaler {
                cursor.details.retain(|image| &image.scaler == scaler);
            }
            if cmd.alpha {
                // save images for sorting later if alphabetize flag is set
                images.append(&mut cursor.details);
            } else {
                // otherwise print immediately if no need to alphabetize
                cursor.details.iter().for_each(GetImagesLine::print_image);
            }
        }
    }
    // sort and print in alphabetical order if alpha flag was set
    if cmd.alpha {
        images.sort_unstable_by(|a, b| a.name.cmp(&b.name));
        images.iter().for_each(GetImagesLine::print_image);
    }
    Ok(())
}

/// Describe a specific image in full
///
/// # Arguments
///
/// * `thorium` - The Thorium client
/// * `cmd` - The describe image command to execute
async fn describe(thorium: Thorium, cmd: &DescribeImages) -> Result<(), Error> {
    cmd.describe(&thorium).await
}

/// Handle all images commands
///
/// # Arguments
///
/// * `args` - The arguments passed to Thorctl
/// * `cmd` - The reactions command to execute
pub async fn handle(args: &Args, cmd: &Images) -> Result<(), Error> {
    // load our config and instance our client
    let (conf, thorium) = utils::get_client(args).await?;
    // warn about insecure connections if not set to skip
    if !conf.skip_insecure_warning.unwrap_or_default() {
        utils::warn_insecure_conf(&conf)?;
    }
    // check if we need to update
    if !args.skip_update && !conf.skip_update.unwrap_or_default() {
        update::ask_update(&thorium).await?;
    }
    // call the right reactions handler
    match cmd {
        Images::Get(cmd) => get(thorium, cmd).await,
        Images::Describe(cmd) => describe(thorium, cmd).await,
        Images::Notifications(cmd) => notifications::handle(thorium, cmd).await,
        Images::Bans(cmd) => bans::handle(thorium, cmd).await,
        Images::Edit(cmd) => edit::edit(thorium, &conf, cmd).await,
    }
}
