use crate::models::User;
use crate::utils::Shared;

/// The keys to use to access user data/sets
#[derive(Debug)]
pub struct UserKeys {
    /// The key to user list
    pub global: String,
    /// The key to user/token map
    pub tokens: String,
    /// The key to user data
    pub data: String,
    /// The key to this users group set
    pub groups: String,
    /// The key to the set of analysts in Thorium
    #[allow(dead_code)]
    pub analysts: String,
}

impl UserKeys {
    /// Builds the keys to access user data/sets in redis
    ///
    ///
    /// # Arguments
    ///
    /// * `user` - User object to build key from
    /// * `shared` - Shared Thorium objects
    pub fn new(user: &User, shared: &Shared) -> Self {
        // build key to user list
        let global = Self::global(shared);
        // build key to user token map
        let tokens = Self::tokens(shared);
        // build key to store user data at
        let data = Self::data(&user.username, shared);
        // build key to store user groups at
        let groups = Self::groups(&user.username, shared);
        // build key to the analyst set
        let analysts = Self::analysts(shared);
        // build key object
        UserKeys {
            global,
            tokens,
            data,
            groups,
            analysts,
        }
    }

    /// builds users set key
    ///
    /// # Arguments
    ///
    /// * `shared` - Shared Thorium objects
    pub fn global(shared: &Shared) -> String {
        format!("{ns}:users", ns = shared.config.thorium.namespace)
    }

    /// builds users set key
    ///
    /// # Arguments
    ///
    /// * `shared` - Shared Thorium objects
    pub fn tokens(shared: &Shared) -> String {
        format!("{ns}:users_token_map", ns = shared.config.thorium.namespace)
    }

    // user data key
    ///
    /// # Arguments
    ///
    /// * `user` - User object to build key from
    /// * `shared` - Shared Thorium objects
    pub fn data(user: &str, shared: &Shared) -> String {
        format!(
            "{ns}:user_data:{user}",
            ns = shared.config.thorium.namespace,
            user = user,
        )
    }

    // user groups key
    ///
    /// # Arguments
    ///
    /// * `user` - User object to build key from
    /// * `shared` - Shared Thorium objects
    pub fn groups(user: &str, shared: &Shared) -> String {
        format!(
            "{ns}:user_groups:{user}",
            ns = shared.config.thorium.namespace,
            user = user,
        )
    }

    /// The key to all analysts in Thorium
    ///
    /// # Arguments
    ///
    /// * `shared` - Shared Thorium objects
    pub fn analysts(shared: &Shared) -> String {
        format!("{ns}:analysts", ns = shared.config.thorium.namespace)
    }
}
