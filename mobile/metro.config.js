const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow importing modules from the workspace root
config.watchFolders = [path.resolve(__dirname, '..')];

module.exports = config;
