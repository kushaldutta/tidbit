const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Replace the Node.js `ws` package with a shim that uses React Native's
// native WebSocket. This prevents ws from trying to import Node built-ins
// (stream, zlib, net, tls…) that don't exist in the RN/Hermes environment.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ws: path.resolve(__dirname, 'src/shims/ws.js'),
};

module.exports = config;
