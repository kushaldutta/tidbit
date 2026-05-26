const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// `extraNodeModules` won't override ws because ws is already installed in
// node_modules. We need `resolveRequest` to intercept every require('ws')
// call (from any package, including @supabase/realtime-js) and redirect it
// to our React-Native-compatible shim that uses the native global WebSocket.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'ws') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'src/shims/ws.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
