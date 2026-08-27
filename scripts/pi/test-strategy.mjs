// Send a strategy to the lamp backend over socket.io (default: solid red).
// Usage: node scripts/pi/test-strategy.mjs [color]            e.g. red, green, blue
//        node scripts/pi/test-strategy.mjs --json '{"name":"image","params":{...}}'
// Needs socket.io-client (v4+) installed in scripts/pi/: `npm i socket.io-client` there.
import { createRequire } from 'module';

const requireLocal = createRequire(import.meta.url);
let io;
try {
  io = requireLocal('socket.io-client').io;
} catch {
  console.error('socket.io-client not found — run: cd scripts/pi && npm i socket.io-client');
  process.exit(1);
}

const host = process.env.PI_HOST || '192.168.17.34';
const arg = process.argv[2] || 'red';
const strategy = arg === '--json'
  ? JSON.parse(process.argv[3])
  : { name: 'color', params: { fill: arg } };

const socket = io(`http://${host}:30008`, { transports: ['websocket'] });
socket.on('connect', () => {
  console.log(`connected to ${host}:30008, sending ${JSON.stringify(strategy)}`);
  socket.emit('select-strategy', strategy);
  setTimeout(() => process.exit(0), 4000);
});
socket.on('connect_error', (e) => { console.error('connect_error:', e.message); process.exit(1); });
setTimeout(() => { console.error('timeout'); process.exit(1); }, 15000);