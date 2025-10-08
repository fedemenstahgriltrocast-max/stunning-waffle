//! Arguments for config-related Thorctl commands

use std::path::PathBuf;

/// A command to modify the Thorctl configuration file
#[derive(clap::Parser, Debug)]
pub struct Config {
    /// The group of optional config updates where at least one is set
    #[clap(flatten)]
    pub config_opts: ConfigOpts,
}

/// The set of possible updates to the configuration file where at least one is set
#[derive(clap::Args, Debug)]
#[group(required = true, multiple = true)]
#[allow(clippy::module_name_repetitions)]
pub struct ConfigOpts {
    /// The location to SSH keys to use when cloning repos with `thorctl repos ingest`
    #[clap(long)]
    pub git_ssh_keys: Option<PathBuf>,
    /// Skip certificate validation when connecting to Thorium
    #[clap(long)]
    pub invalid_certs: Option<bool>,
    /// Skip hostname validation when connecting to Thorium
    #[clap(long)]
    pub invalid_hostnames: Option<bool>,
    /// Any paths to certificate authorities to add to a list of those implicitly trusted
    /// when connecting to Thorium
    #[clap(short, long, value_delimiter = ',')]
    pub certificate_authorities: Vec<PathBuf>,
    /// Any paths to certificate authorities to remove from the list of those implicitly trusted
    /// when connecting to Thorium
    #[clap(short, long, value_delimiter = ',')]
    pub remove_certificate_authorities: Vec<PathBuf>,
    /// Clear the list of certificate authorities to implicitly trust
    #[clap(
        long,
        conflicts_with = "certificate_authorities",
        conflicts_with = "remove_certificate_authorities"
    )]
    pub clear_certificate_authorities: bool,
    /// The timeout for all requests to the Thorium API
    #[clap(long)]
    pub timeout: Option<u64>,
    /// Disable the warning when Thorctl is set to connect insecurely to Thorium
    #[clap(long)]
    pub skip_insecure_warning: Option<bool>,
    /// Skip the automatic check for Thorctl updates
    #[clap(long)]
    pub skip_update: Option<bool>,
    /// The default editor Thorctl will use
    #[clap(long)]
    pub default_editor: Option<String>,
}
