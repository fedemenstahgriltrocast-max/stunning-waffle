//! A CLI tool for working with Thorium

#![feature(path_file_prefix)]
#![feature(os_str_slice)]

use clap::Parser;
use thorium::{CtlConf, Error};

mod args;
mod errors;
mod handlers;
mod utils;

use args::{Args, SubCommands};

#[tokio::main]
async fn main() {
    // get the command line args that were passed in
    let args = Args::parse();
    // fall into the right handler and execute this users command
    if let Err(err) = match &args.cmd {
        SubCommands::Login(login) => handlers::clusters::login(&args, login).await,
        SubCommands::Clusters(clusters) => handlers::clusters::handle(&args, clusters).await,
        SubCommands::Groups(groups) => handlers::groups::handle(&args, groups).await,
        SubCommands::Files(files) => handlers::files::handle(&args, files).await,
        SubCommands::Images(images) => handlers::images::handle(&args, images).await,
        SubCommands::Pipelines(pipelines) => handlers::pipelines::handle(&args, pipelines).await,
        SubCommands::Reactions(reactions) => handlers::reactions::handle(&args, reactions).await,
        SubCommands::Results(results) => handlers::results::handle(&args, results).await,
        SubCommands::Tags(tags) => handlers::tags::handle(&args, tags).await,
        SubCommands::Repos(repos) => handlers::repos::handle(&args, repos).await,
        SubCommands::NetworkPolicies(network_policies) => {
            handlers::network_policies::handle(&args, network_policies).await
        }
        SubCommands::Cart(cart) => handlers::cart::handle(&args, cart).await,
        SubCommands::Uncart(uncart) => handlers::uncart::handle(&args, uncart).await,
        SubCommands::Run(run) => handlers::run::handle(&args, run).await,
        SubCommands::Update => handlers::update::update(&args).await,
        SubCommands::Config(config) => handlers::config::config(&args, config),
    } {
        // print the error
        eprintln!("{err}");
        // TODO: exit with matching code?
        std::process::exit(1);
    }
}
