//! Contains useful functions for interacting with notifications

use owo_colors::colors::{BrightBlue, BrightGreen, BrightRed, BrightYellow};
use owo_colors::OwoColorize;
use thorium::models::backends::NotificationSupport;
use thorium::models::{Notification, NotificationLevel};

/// Print a list of notifications to stdout
///
/// # Arguments
///
/// * `notifications` - The notifications to print
/// * `ids` - Whether or not to print the notifications' id's along with their contents
#[rustfmt::skip]
pub fn print_notifications<N: NotificationSupport>(notifications: &[Notification<N>], ids: bool) {
    if ids {
        for notification in notifications {
            let level = notification.level.as_ref().to_uppercase();
            match &notification.level {
                NotificationLevel::Info => {
                    println!("[{}] {} {}: {}", notification.created, notification.id.fg::<BrightGreen>(), level.fg::<BrightBlue>(), notification.msg);
                }
                NotificationLevel::Warn => {
                    println!("[{}] {} {}: {}", notification.created, notification.id.fg::<BrightGreen>(), level.fg::<BrightYellow>(), notification.msg);
                }
                NotificationLevel::Error => {
                    println!("[{}] {} {}: {}", notification.created, notification.id.fg::<BrightGreen>(), level.fg::<BrightRed>(), notification.msg);
                }
            }
        }
    } else {
        for notification in notifications {
            let level = notification.level.as_ref().to_uppercase();
            match &notification.level {
                NotificationLevel::Info => {
                    println!("[{}] {}: {}", notification.created, level.fg::<BrightBlue>(), notification.msg);
                }
                NotificationLevel::Warn => {
                    println!("[{}] {}: {}", notification.created, level.fg::<BrightYellow>(), notification.msg);
                }
                NotificationLevel::Error => {
                    println!("[{}] {}: {}", notification.created, level.fg::<BrightRed>(), notification.msg);
                }
            }
        }
    }
}
