import { config } from 'dotenv';
import { resolve } from 'node:path';

import { createServer } from 'node:http';

import { runDatabaseMigrations } from '@gitgud/database';
import { gameEngineEnv } from './config/env';
import { gameEngineApp } from './app';
import { registerGameSockets } from './sockets';
import { Server } from 'socket.io';

config({ path: resolve(process.cwd(), '.env') });

async function start() {
  await runDatabaseMigrations();

  const server = createServer(gameEngineApp);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  registerGameSockets(io);

  server.listen(gameEngineEnv.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Game Engine Service listening on port ${gameEngineEnv.port}`);
  });
}

void start();
