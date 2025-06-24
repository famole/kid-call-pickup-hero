const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing modules from the workspace root
config.watchFolders = [path.resolve(__dirname, '..')];

// Map the "@" alias used in shared code to the root src directory
config.resolver = {
  ...(config.resolver || {}),
  extraNodeModules: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
};

module.exports = config;
