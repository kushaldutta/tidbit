const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Polyfill Node.js built-ins that ws/supabase-realtime need
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  stream: require.resolve('readable-stream'),
};

module.exports = config;
