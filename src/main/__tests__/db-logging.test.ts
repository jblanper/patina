// @vitest-environment node
/**
 * db.ts logger instrumentation tests.
 *
 * better-sqlite3 is a native Electron addon compiled against a different
 * Node.js version, so vi.importActual cannot be used here. Instead,
 * we mock the module with a minimal stub and focus purely on verifying
 * that logger.debug / logger.info / logger.error are called at the right
 * points, not on SQL correctness (which is covered by integration tests).
 *
 * Covers: db:open, db:query (insert/update/delete for coins and images),
 * and db:imageDeleteFailed when disk cleanup throws.
 */
import { describe, it, expect, vi } from 'vitest';
import os from 'os';

// ── Hoisted stubs — available inside vi.mock() factories ─────────────────

const mockFsExistsSync = vi.hoisted(() => vi.fn(function() { return true; }));
const mockFsUnlinkSync = vi.hoisted(() => vi.fn(function() { /* no-op */ }));

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

// Shared prepared-statement stub returned by every db.prepare() call.
const mockStmt = vi.hoisted(() => ({
  run: vi.fn(function() { return { changes: 1, lastInsertRowid: 1 }; }),
  all: vi.fn(function() { return [] as unknown[]; }),
  get: vi.fn(function() { return undefined; }),
}));

// ── Module mocks ──────────────────────────────────────────────────────────

vi.mock('../logger', () => ({ logger: mockLogger }));

vi.mock('electron', () => ({
  app: { isPackaged: true, getPath: vi.fn(function() { return os.tmpdir(); }) },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockFsExistsSync,
    mkdirSync: vi.fn(),
    unlinkSync: mockFsUnlinkSync,
  },
}));

// Pure stub — bypasses the native binary entirely.
// The constructor is a regular function so `new Database(path)` works.
vi.mock('better-sqlite3', () => ({
  default: vi.fn(function DatabaseStub() {
    return {
      pragma: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn(function() { return mockStmt; }),
    };
  }),
}));

// ── Import (after all mocks are in place) ────────────────────────────────

import { dbService } from '../db';

// ── Fixtures ──────────────────────────────────────────────────────────────

const COIN = { title: 'Test Aureus', era: 'Roman Imperial' } as const;

// ── Tests ─────────────────────────────────────────────────────────────────

describe('db.ts — logger instrumentation', () => {
  // db:open is emitted at module-load time, before any vi.clearAllMocks().
  // This block must come first and must not clear mocks.
  describe('module load', () => {
    it('emits db:open with the database filename', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ file: expect.stringContaining('.db') }),
        'db:open',
      );
    });
  });

  describe('write operations', () => {
    it('addCoin emits db:query with op:insert, table:coins, and the row id', () => {
      vi.clearAllMocks();
      dbService.addCoin(COIN);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ op: 'insert', table: 'coins', id: 1 }),
        'db:query',
      );
    });

    it('updateCoin emits db:query with op:update and the coin id when changes > 0', () => {
      const id = dbService.addCoin(COIN); // id = 1
      vi.clearAllMocks();
      dbService.updateCoin(id, { era: 'Byzantine' });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ op: 'update', table: 'coins', id }),
        'db:query',
      );
    });

    it('deleteCoin emits db:query with op:delete and the coin id', () => {
      const id = dbService.addCoin(COIN);
      vi.clearAllMocks();
      dbService.deleteCoin(id);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ op: 'delete', table: 'coins', id }),
        'db:query',
      );
    });

    it('addImage emits db:query with op:insert, table:coin_images, and the coinId', () => {
      const coinId = dbService.addCoin(COIN);
      vi.clearAllMocks();
      dbService.addImage({ coin_id: coinId, path: 'coins/test.jpg', is_primary: true, sort_order: 0 });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ op: 'insert', table: 'coin_images', coinId }),
        'db:query',
      );
    });

    it('deleteImage emits db:query with op:delete and the image id', () => {
      const coinId = dbService.addCoin(COIN);
      const imageId = dbService.addImage({ coin_id: coinId, path: 'coins/img.jpg', is_primary: false, sort_order: 1 });
      vi.clearAllMocks();
      dbService.deleteImage(imageId);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({ op: 'delete', table: 'coin_images', id: imageId }),
        'db:query',
      );
    });

    it('deleteCoin emits db:imageDeleteFailed when disk cleanup throws', () => {
      const coinId = dbService.addCoin(COIN);
      vi.clearAllMocks();
      // Make all() return one image path so the cleanup loop executes
      mockStmt.all.mockReturnValueOnce([{ path: 'coins/photo.jpg' }]);
      mockFsExistsSync.mockReturnValueOnce(true);
      mockFsUnlinkSync.mockImplementationOnce(function() {
        throw new Error('EACCES: permission denied');
      });
      dbService.deleteCoin(coinId);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('EACCES') }),
        'db:imageDeleteFailed',
      );
    });
  });
});
