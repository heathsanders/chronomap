const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix EMFILE errors by using polling instead of native file watching
config.server = {
  ...config.server,
  useWatchman: false,
};

config.watcher = {
  ...config.watcher,
  usePolling: true,
  interval: 1000,
};

module.exports = config;