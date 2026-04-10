import { describe, it, expect, vi } from 'vitest';
import { timedHandler } from '../ipc-utils';
import type { Logger } from 'pino';

function makeLogger() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } as unknown as Logger;
}

describe('timedHandler', () => {
  it('calls logger.debug with channel and durationMs on success', async () => {
    const logger = makeLogger();
    const result = await timedHandler(logger, 'test:channel', () => 'ok');
    expect(result).toBe('ok');
    expect(logger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'test:channel', durationMs: expect.any(Number) }),
      'ipc:call'
    );
  });

  it('calls logger.error with channel and message on throw, and rethrows', async () => {
    const logger = makeLogger();
    const err = new Error('boom');
    await expect(
      timedHandler(logger, 'test:error', () => { throw err; })
    ).rejects.toThrow('boom');
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'test:error', message: 'boom' }),
      'ipc:error'
    );
  });

  it('handles async handlers', async () => {
    const logger = makeLogger();
    const result = await timedHandler(logger, 'async:channel', async () => {
      return 42;
    });
    expect(result).toBe(42);
    expect(logger.debug).toHaveBeenCalledOnce();
  });

  it('durationMs is non-negative', async () => {
    const logger = makeLogger();
    await timedHandler(logger, 'timing:check', () => undefined);
    const call = (logger.debug as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call.durationMs).toBeGreaterThanOrEqual(0);
  });
});
