// @vitest-environment node
/**
 * Lens server instrumentation tests.
 * Verifies logger calls for every significant HTTP event: lifecycle, auth failures,
 * MIME rejection, successful upload, and per-request logging.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import os from 'os';
import path from 'path';
import fs from 'fs';

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock('../logger', () => ({ logger: mockLogger }));

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getPath: vi.fn(() => os.tmpdir()),
  },
}));

import { createLensServer } from '../server';

describe('Lens server — instrumentation', () => {
  const imgDir = path.join(os.tmpdir(), 'images', 'coins');
  let instance: ReturnType<typeof createLensServer>;
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    fs.mkdirSync(imgDir, { recursive: true });
    instance = createLensServer({ locale: 'en' });
    ({ token } = await instance.start());
  });

  afterEach(() => {
    instance.stop();
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  it('emits lens:start with port on start()', () => {
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ port: expect.any(Number) }),
      'lens:start',
    );
  });

  it('emits lens:stop on stop()', () => {
    instance.stop();
    expect(mockLogger.info).toHaveBeenCalledWith('lens:stop');
  });

  // ── Per-request logging ───────────────────────────────────────────────────

  it('emits lens:request with method, path, statusCode, durationMs for each request', async () => {
    await request(instance.app).get(`/lens/${token}`);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: `/lens/${token}`,
        statusCode: 200,
        durationMs: expect.any(Number),
      }),
      'lens:request',
    );
  });

  // ── Auth failures ─────────────────────────────────────────────────────────

  it('emits lens:authFail and 403 lens:request on invalid GET token', async () => {
    await request(instance.app).get('/lens/invalid-token');
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { reason: 'invalid_token' },
      'lens:authFail',
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 }),
      'lens:request',
    );
  });

  it('emits lens:authFail on invalid POST upload token', async () => {
    await request(instance.app)
      .post('/lens/invalid-token/upload')
      .attach('image', Buffer.from('data'), { filename: 'coin.jpg', contentType: 'image/jpeg' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { reason: 'invalid_token' },
      'lens:authFail',
    );
  });

  // ── MIME filtering ────────────────────────────────────────────────────────

  it('emits lens:mimeRejected when a blocked MIME type is uploaded', async () => {
    await request(instance.app)
      .post(`/lens/${token}/upload`)
      .attach('image', Buffer.from('<svg/>'), { filename: 'evil.svg', contentType: 'image/svg+xml' });
    expect(mockLogger.warn).toHaveBeenCalledWith(
      { mime: 'image/svg+xml' },
      'lens:mimeRejected',
    );
  });

  // ── Successful upload ─────────────────────────────────────────────────────

  it('emits lens:upload with mime and sizeBytes on successful JPEG upload', async () => {
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    await request(instance.app)
      .post(`/lens/${token}/upload`)
      .attach('image', fakeJpeg, { filename: 'coin.jpg', contentType: 'image/jpeg' });
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ mime: 'image/jpeg', sizeBytes: expect.any(Number) }),
      'lens:upload',
    );
  });
});
