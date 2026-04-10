import type { Logger } from 'pino';

export async function timedHandler<T>(
  logger: Logger,
  channel: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.debug({ channel, durationMs: Date.now() - start }, 'ipc:call');
    return result;
  } catch (error) {
    logger.error({ channel, message: (error as Error).message }, 'ipc:error');
    throw error;
  }
}
