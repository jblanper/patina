import pino from 'pino';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

function buildLogger() {
  const isDev = !app.isPackaged;
  const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info');

  if (isDev) {
    return pino({ level }, pino.transport({ target: 'pino-pretty' }));
  }

  const logDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logFile = path.join(logDir, 'patina.log');

  return pino(
    {
      level,
      redact: ['title', 'issuer', 'description', 'notes', 'obverse_desc', 'reverse_desc'],
    },
    pino.transport({
      target: 'pino-roll',
      options: { file: logFile, size: '5m', limit: { count: 3 } },
    })
  );
}

export const logger = buildLogger();
