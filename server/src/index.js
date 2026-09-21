'use strict';

const http = require('http');
const config = require('./config');
const app = require('./app');
const { connect, disconnect } = require('./db/mongo');
const { setupWebSocket } = require('./ws');

async function main() {
  try {
    await connect();
    console.log(`[db] connected to ${config.MONGO_DB}`);
  } catch (err) {
    console.error(`[db] cannot reach MongoDB at ${config.MONGO_URI}: ${err.message}`);
    console.error('[db] start it with `docker compose up -d` from the repo root, then retry.');
    process.exit(1);
  }

  const server = http.createServer(app);
  setupWebSocket(server);
  server.listen(config.PORT, () => {
    console.log(`[api] listening on http://localhost:${config.PORT} (ws: /ws/interview)`);
  });

  const shutdown = async () => {
    server.close();
    await disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  main();
}

module.exports = { app, setupWebSocket };
