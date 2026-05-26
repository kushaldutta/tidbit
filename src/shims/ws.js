// React Native has a native WebSocket — no need for the Node.js `ws` package.
// This shim re-exports the global so @supabase/realtime-js works without
// pulling in Node built-ins (stream, zlib, etc.) that don't exist on device.
const W = global.WebSocket;
module.exports = W;
module.exports.WebSocket = W;
module.exports.default = W;
