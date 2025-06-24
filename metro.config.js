const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add resolver configuration for react-native-camera
config.resolver.platforms = ["ios", "android", "native", "web"];

// Ensure react-native-camera uses the general flavor
config.resolver.resolverMainFields = ["react-native", "browser", "main"];

module.exports = config;
