const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const config = getDefaultConfig(__dirname);
const orig = config.resolver.resolveRequest;
const webStubs = {
  "react-native-maps": "web-stubs/react-native-maps.js",
  "expo-secure-store": "web-stubs/expo-secure-store.js",
};
config.resolver.resolveRequest = (ctx, name, platform) => {
  if (platform === "web" && webStubs[name]) return { type: "sourceFile", filePath: path.join(__dirname, webStubs[name]) };
  return orig ? orig(ctx, name, platform) : ctx.resolveRequest(ctx, name, platform);
};
module.exports = config;
