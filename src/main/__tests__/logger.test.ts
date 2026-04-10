import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Writable } from 'stream';

// Tests cover: dev/prod transport branch selection, log directory creation,
// privacy (redact), and module structure.

describe('logger module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('uses pino-pretty transport in dev (isPackaged=false)', async () => {
    const transportSpy = vi.fn().mockReturnValue({});
    vi.doMock('pino', () => {
      const pino = vi.fn().mockReturnValue({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
      });
      (pino as unknown as { transport: typeof transportSpy }).transport = transportSpy;
      return { default: pino };
    });
    vi.doMock('electron', () => ({
      app: { isPackaged: false, getVersion: vi.fn(() => '1.0.0'), getPath: vi.fn(() => '/tmp/test') },
    }));
    vi.doMock('fs', () => ({ default: { mkdirSync: vi.fn() } }));

    const { logger } = await import('../logger');
    expect(logger).toBeDefined();

    const transportCallArgs = transportSpy.mock.calls[0]?.[0];
    expect(transportCallArgs?.target).toBe('pino-pretty');
  });

  it('uses pino-roll transport and creates log dir in prod (isPackaged=true)', async () => {
    const mkdirSyncMock = vi.fn();
    const transportSpy = vi.fn().mockReturnValue({});
    vi.doMock('pino', () => {
      const pino = vi.fn().mockReturnValue({
        debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
      });
      (pino as unknown as { transport: typeof transportSpy }).transport = transportSpy;
      return { default: pino };
    });
    vi.doMock('electron', () => ({
      app: { isPackaged: true, getVersion: vi.fn(() => '1.0.0'), getPath: vi.fn(() => '/tmp/userdata') },
    }));
    vi.doMock('fs', () => ({ default: { mkdirSync: mkdirSyncMock } }));

    const { logger } = await import('../logger');
    expect(logger).toBeDefined();

    expect(mkdirSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('logs'),
      { recursive: true }
    );

    const transportCallArgs = transportSpy.mock.calls[0]?.[0];
    expect(transportCallArgs?.target).toBe('pino-roll');
  });

  it('respects LOG_LEVEL env override', async () => {
    process.env.LOG_LEVEL = 'trace';
    const pinoSpy = vi.fn().mockReturnValue({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    });
    (pinoSpy as unknown as { transport: () => object }).transport = () => ({});
    vi.doMock('pino', () => ({ default: pinoSpy }));
    vi.doMock('electron', () => ({
      app: { isPackaged: false, getPath: vi.fn(() => '/tmp') },
    }));
    vi.doMock('fs', () => ({ default: { mkdirSync: vi.fn() } }));

    await import('../logger');

    const callArgs = pinoSpy.mock.calls[0]?.[0];
    expect(callArgs?.level).toBe('trace');

    delete process.env.LOG_LEVEL;
  });

  it('pino redact config prevents sensitive coin fields from appearing in log output', () => {
    // Use a real pino instance (not logger.ts) to verify the redact config works at runtime.
    // This proves the privacy contract: sensitive field values are replaced with [Redacted].
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pino = require('pino');
    const lines: string[] = [];
    const dest = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        lines.push(chunk.toString().trim());
        cb();
      },
    });

    const testLogger = pino(
      {
        level: 'info',
        redact: ['title', 'issuer', 'description', 'notes', 'obverse_desc', 'reverse_desc'],
      },
      dest,
    );

    testLogger.info({ title: 'Aureus of Augustus', issuer: 'Augustus', id: 42 }, 'db:query');

    expect(lines).toHaveLength(1);
    const parsed: Record<string, unknown> = JSON.parse(lines[0]);
    expect(parsed.title).toBe('[Redacted]');
    expect(parsed.issuer).toBe('[Redacted]');
    expect(parsed.id).toBe(42); // non-sensitive fields pass through unchanged
  });

  it('redact config includes all sensitive coin fields in prod', async () => {
    const pinoSpy = vi.fn().mockReturnValue({
      debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
    });
    (pinoSpy as unknown as { transport: () => object }).transport = () => ({});
    vi.doMock('pino', () => ({ default: pinoSpy }));
    vi.doMock('electron', () => ({
      app: { isPackaged: true, getPath: vi.fn(() => '/tmp/userdata') },
    }));
    vi.doMock('fs', () => ({ default: { mkdirSync: vi.fn() } }));

    await import('../logger');

    const callArgs = pinoSpy.mock.calls[0]?.[0];
    const redact: string[] = callArgs?.redact ?? [];
    const expected = ['title', 'issuer', 'description', 'notes', 'obverse_desc', 'reverse_desc'];
    for (const field of expected) {
      expect(redact).toContain(field);
    }
  });
});
