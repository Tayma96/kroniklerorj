// Expo'nun varsayılan Metro ayarı; react-native-filament modelleri (.glb) varlık olarak paketlenir.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes("glb")) config.resolver.assetExts.push("glb");

module.exports = config;
