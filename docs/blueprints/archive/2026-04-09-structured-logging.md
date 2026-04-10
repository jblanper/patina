# Implementation Blueprint: Structured Logging System

**Date:** 2026-04-09
**Status:** Completed

---

## 1. Objective

Add a `pino`-based structured logging system to the Patina main process for debugging and operational visibility. The system produces rotating NDJSON log files in production and pretty-printed console output in development. A thin IPC relay surfaces renderer `ErrorBoundary` exceptions into the same log stream.

### Philosophical Alignment

- [x] **Archival Ledger Aesthetic:** Zero renderer UI changes. Log infrastructure is invisible to the user.
- [x] **Privacy First:** Strict rules prohibit logging any coin field values. Only IDs, counts, durations, operation names, MIME types, and error messages are recorded. Log files never leave the machine.
- [x] **Single-Click Rule:** Not applicable — no UI surface.

---

## 2. Technical Strategy

### 2.1 New Packages

| Package | Type | Purpose |
|---|---|---|
| `pino` | production dep | Core structured logger |
| `pino-roll` | production dep | Log file rotation (needed in packaged app) |
| `pino-pretty` | dev dep | Human-readable console transport — never bundled |

Install command:
```bash
npm install pino pino-roll --legacy-peer-deps
npm install --save-dev pino-pretty --legacy-peer-deps
```

### 2.2 New File: `src/main/logger.ts`

Singleton Pino logger. Transport is selected once at startup based on `app.isPackaged`:

```
Dev  → pino-pretty → stdout
Prod → NDJSON      → userData/logs/patina.log (pino-roll: 5 MB max, 3 rotations)
```

The log directory (`userData/logs/`) is created with `fs.mkdirSync(..., { recursive: true })` before the transport is constructed. Log level: `'debug'` in dev, `'info'` in production (overridable via `LOG_LEVEL` env var for targeted debugging).

**Privacy contract encoded in module:** export a `redact` config that strips any top-level key named `title`, `issuer`, `description`, `notes`, `obverse_desc`, `reverse_desc` from log objects — a belt-and-suspenders guard in addition to the call-site discipline.

```typescript
// src/main/logger.ts (outline)
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

  return pino({ level, redact: ['title', 'issuer', 'description', 'notes', 'obverse_desc', 'reverse_desc'] },
    pino.transport({ target: 'pino-roll', options: { file: logFile, size: '5m', limit: { count: 3 } } })
  );
}

export const logger = buildLogger();
```

### 2.3 `src/main/index.ts` — IPC Instrumentation

**A. Replace existing `console.*` calls (4 locations):**

| Line | Current | Replacement |
|---|---|---|
| 62 | `console.warn('Blocked unauthorized navigation...')` | `logger.warn({ origin }, 'security:navBlocked')` — log origin only, not full URL |
| 66 | `console.warn('Blocked unauthorized navigation...')` | `logger.warn({ protocol }, 'security:navBlocked')` |
| 73 | `console.warn('Blocked unauthorized window...')` | `logger.warn({ origin }, 'security:windowBlocked')` |
| 164 | `console.error('Failed to start Lens server:', error)` | `logger.error({ message: (error as Error).message }, 'lens:startFailed')` |

**B. Enhance `validateIpc` — emit warn on validation failure:**
```typescript
function validateIpc<T>(schema: ZodSchema<T>, data: unknown, channel?: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join(', ');
    logger.warn({ channel, errors: msg }, 'ipc:invalid');
    throw new Error(`Validation failed: ${msg}`);
  }
  return result.data;
}
```

**C. IPC timing wrapper — applied to all handlers:**

Extracted to `src/main/ipc-utils.ts` (per quality audit — enables isolated unit testing with an injected logger mock). `index.ts` imports and uses it:
```typescript
// src/main/ipc-utils.ts
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
```

Usage example:
```typescript
ipcMain.handle('db:addCoin', (_, coin: NewCoin) =>
  timedHandler('db:addCoin', () => dbService.addCoin(coin))
);
```

**D. App lifecycle events:**
```typescript
app.whenReady().then(() => {
  logger.info({ version: app.getVersion(), platform: process.platform, isDev: !app.isPackaged }, 'app:ready');
  // ... existing setup
});

app.on('before-quit', () => logger.info('app:quit'));
```

**E. Unhandled error hooks:**
```typescript
process.on('uncaughtException', (error) => {
  logger.error({ message: error.message, stack: error.stack }, 'app:uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ message: String(reason) }, 'app:unhandledRejection');
});
```

**F. Renderer error relay (`log:error` IPC channel):**
```typescript
const rendererLogSchema = z.object({
  message: z.string().max(500),
  stack: z.string().max(1000).optional(),
}).strict();

ipcMain.handle('log:error', (_, data: unknown) => {
  const { message, stack } = validateIpc(rendererLogSchema, data, 'log:error');
  logger.error({ message, stack }, 'renderer:error');
});
```

### 2.4 `src/main/db.ts` — Database Instrumentation

**A. Replace `console.error` (line 262, image file deletion):**
```typescript
logger.error({ message: (err as Error).message }, 'db:imageDeleteFailed');
```

**B. Log DB open (in constructor / init):**
```typescript
logger.info({ file: path.basename(dbPath) }, 'db:open');
```

**C. Log key write operations** — after successful statement execution, using rowsAffected from `stmt.run()`:
- `addCoin` → `logger.debug({ op: 'insert', table: 'coins', id: Number(result.lastInsertRowid) }, 'db:query')`
- `updateCoin` → `logger.debug({ op: 'update', table: 'coins', id }, 'db:query')`
- `deleteCoin` → `logger.debug({ op: 'delete', table: 'coins', id }, 'db:query')`
- `addImage` → `logger.debug({ op: 'insert', table: 'coin_images', coinId }, 'db:query')`
- `deleteImage` → `logger.debug({ op: 'delete', table: 'coin_images', id }, 'db:query')`

Read operations (`getCoins`, `getCoinById`, `getImagesByCoinId`) are **not** logged — read volume can be high and they carry no mutation risk.

### 2.5 `src/main/server.ts` — Lens HTTP Logging

**A. Request logging middleware** (manual, no additional native dep):
```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.debug({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
    }, 'lens:request');
  });
  next();
});
```

**B. Auth failure logging** — at both 403 token-check guard points:
```typescript
logger.warn({ reason: 'invalid_token' }, 'lens:authFail');
```

**C. Upload events:**
```typescript
// On successful upload
logger.info({ mime: req.file.mimetype, sizeBytes: req.file.size }, 'lens:upload');

// In fileFilter when MIME is blocked
logger.warn({ mime: file.mimetype }, 'lens:mimeRejected');
```

**D. Server lifecycle:**
```typescript
// In start()
logger.info({ port, localIp }, 'lens:start');

// In stop()
logger.info('lens:stop');
```

### 2.6 Renderer: ErrorBoundary Relay

**`src/main/preload.ts`** — add to `contextBridge.exposeInMainWorld`:
```typescript
logError: (data: { message: string; stack?: string }) =>
  ipcRenderer.invoke('log:error', data),
```

**`src/renderer/main.tsx`** — add `onError` prop to `<ErrorBoundary>`:
```tsx
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error) => {
    window.electronAPI.logError({
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 4).join('\n'),
    });
  }}
>
```

**Privacy note:** `componentStack` from the second `onError` argument is not sent (may contain component names referencing coin data in future).

---

## 3. Log Schema Reference

All log lines are NDJSON. Common structure:

```json
{ "level": 30, "time": 1712600000000, "msg": "ipc:call", "channel": "db:addCoin", "durationMs": 8 }
{ "level": 40, "time": 1712600001000, "msg": "ipc:invalid", "channel": "vocab:add", "errors": "value: required" }
{ "level": 50, "time": 1712600002000, "msg": "ipc:error", "channel": "export:toZip", "message": "SQLITE_CONSTRAINT" }
{ "level": 30, "time": 1712600003000, "msg": "lens:request", "method": "POST", "path": "/lens/[token]", "statusCode": 200, "durationMs": 45 }
{ "level": 40, "time": 1712600004000, "msg": "lens:authFail", "reason": "invalid_token" }
{ "level": 30, "time": 1712600005000, "msg": "lens:upload", "mime": "image/jpeg", "sizeBytes": 204800 }
{ "level": 40, "time": 1712600006000, "msg": "security:navBlocked", "origin": "https://example.com" }
```

**What is never logged:** `title`, `issuer`, `denomination`, `description`, `notes`, `obverse_desc`, `reverse_desc`, `catalog_ref`, any user-entered text. Lens filenames. IP addresses (except `[redacted]` string for rate-limit events).

---

## 4. Verification Strategy

- **Type check:** `npx tsc --noEmit` — zero errors. Logger singleton must be typed correctly (pino's types ship with the package).
- **Tests:**
  - New `src/main/__tests__/logger.test.ts` — test transport branch selection (mock `app.isPackaged`); verify `pino-pretty` used in dev, file transport in prod; verify log directory creation.
  - Existing IPC handler tests (hooks `__tests__/`) — inject logger spy, assert `ipc:call` debug called on success and `ipc:error` on throw.
  - New `src/main/__tests__/server.test.ts` — extend existing supertest tests to assert `lens:request` log entry after upload.
- **Smoke test:**
  1. `npm run dev` → add a coin → check `data/logs/patina.log` for `ipc:call` with `channel: "db:addCoin"`, no title field.
  2. Start Lens → make a request → verify `lens:start` and `lens:request` entries.
  3. Trigger a Zod validation error (send malformed data) → verify `ipc:invalid` warn entry.

---

## 5. Architectural Oversight (`curating-blueprints`)

**Status:** Approved by Senior Architect

### Review Notes:
- **Process boundary respected:** Logger singleton lives entirely in `src/main/`. Renderer only sends structured `{ message, stack }` through the validated `log:error` IPC channel — no direct Pino exposure across the bridge.
- **The Filter maintained:** `log:error` relay uses a strict Zod schema with `max()` length guards, preventing renderer-side log injection of arbitrarily large payloads.
- **No abstraction leak:** `timedHandler` wraps handlers at the registration site in `index.ts` — it does not touch hook signatures or `src/common/`.
- **Privacy by design:** `redact` config at the Pino level + call-site discipline = two layers. The `redact` option is a last-resort guard, not a substitute for disciplined logging at the call site.
- **pino-roll in production dep:** Correct — pino-roll runs in packaged Electron and needs to be a production dependency.

---

## 6. Security Assessment (`securing-electron`)

**Status:** Verified — No critical or high issues identified.

### Audit Findings:

**MEDIUM — Stack trace content from renderer (§2.6):**
`error.stack` (up to 1000 chars) can contain development file paths (e.g. `/Users/dev/patina/src/...`). Blueprint already truncates to 4 lines on the renderer side before sending — this is sufficient mitigation. Log files do not leave the machine.

**MEDIUM — Renderer `message` field is unverifiable:**
Main process cannot cryptographically verify that `message` originates from a genuine ErrorBoundary vs. a fabricated renderer call. Risk is low (local desktop app, no multi-user context), but log consumers should treat `renderer:error` entries as unverified.

**LOW — `redact` config incomplete:**
Blueprint §2.2 lists `title, issuer, description, notes` but omits `obverse_desc` and `reverse_desc` (documented as sensitive in §3). Both must be added.

**LOW — pino-roll path assumptions:**
`app.getPath('userData')` is trusted as provided by Electron — no traversal risk since the filename (`patina.log`) is hard-coded. No action needed.

### Review Notes & Suggestions:
1. Extend `redact` array to include `obverse_desc` and `reverse_desc`.
2. Stack trace truncation to 4 lines (already in §2.6) is correct — keep it.
3. The `log:error` Zod schema uses `.strict()` — confirmed sufficient.
4. Tag renderer errors with the `renderer:error` msg field (already done in §2.3 F) for log clarity.

---

## 7. Quality Assessment (`assuring-quality`)

**Status:** Verified with recommendations.

### Audit Findings:

**Mocking strategy underspecified:**
`app.isPackaged` and `app.getPath` must be mocked via `vi.mock('electron')` before `logger.ts` is imported, since the logger is built at module load time. Pattern:
```typescript
vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: vi.fn(() => '/tmp/test') }
}));
```
Two test suites (dev branch, prod branch) need separate `vi.mock` setups with `isPackaged: true/false`.

**`timedHandler` not isolatable as written:**
If `timedHandler` is defined as a module-level closure in `index.ts`, it cannot be unit-tested independently. **Recommendation:** Export `timedHandler` from a separate `src/main/ipc-utils.ts` file so it can be tested with a mock logger injected as a parameter.

**Privacy assertion missing:**
No test verifies that `redact` prevents coin field values from appearing in log output. Add a test that logs an object with `{ title: 'test' }` and asserts the transport receives `[Redacted]` for that key. Use `pino.destination()` stream interception.

**`server.test.ts` does not exist:**
Blueprint refers to extending "existing supertest tests" — but there are no existing main-process server tests. The file `src/main/__tests__/server.test.ts` must be created from scratch, with Electron mocked and supertest pointed at `createApp()`.

**~50% of instrumentation points lack explicit test cases:**
App lifecycle events (`app:ready`, `app:quit`), uncaught error hooks, security block logs, and all db.ts instrumentation points are not covered by stated tests. These should at minimum be covered by spy assertions on the logger mock.

### Review Notes & Suggestions:
1. Extract `timedHandler` to `src/main/ipc-utils.ts` with logger as an injectable parameter.
2. Create `src/main/__tests__/logger.test.ts` with dev/prod transport branch tests + privacy assertion.
3. Create `src/main/__tests__/server.test.ts` from scratch.
4. Add spy assertions on all remaining instrumentation points.
5. Colocation: ✓ Correct — `src/main/__tests__/` is the right location.

---

## 8. UI Assessment (`curating-ui`)

**Status:** Verified — No issues identified. Zero renderer UI changes. The only renderer touch is an `onError` callback prop on the existing `<ErrorBoundary>` wrapper in `main.tsx`. Style guide compliance is not affected.

---

## 9. Numismatic & UX Assessment (`curating-coins`)

**Status:** Verified — No coin data, cataloguing logic, or numismatic display is affected. Privacy constraints in §2.2 and §3 explicitly prohibit logging coin field values.

---

## 10. User Consultation & Decisions

**Date:** 2026-04-09

| Decision | Choice | Notes |
|---|---|---|
| `LOG_LEVEL` env var override | **Keep** | Allows targeted debug sessions in production without rebuilding |
| Read operation logging (`getCoins`, `getCoinById`) | **Skip** | Too noisy; mutations are sufficient for debugging |
| `timedHandler` extracted to `src/main/ipc-utils.ts` | **Approved** | Logger injected as parameter for testability |

---

## 11. Post-Implementation Retrospective

**Completed:** 2026-04-10

### What was delivered
- `src/main/logger.ts` — pino singleton, dev/prod transport selection, 6-field redact config
- `src/main/ipc-utils.ts` — `timedHandler` with injected logger, enabling isolated unit tests
- Full instrumentation of `index.ts`, `db.ts`, `server.ts`, and renderer `ErrorBoundary` relay
- 3 new test files, 15 new tests: `logger.test.ts` (5), `ipc-utils.test.ts` (4), `server.test.ts` (7), `db-logging.test.ts` (7)
- `supertest` added as devDependency for Lens server HTTP assertions

### Decisions made during Verification
- **db-logging.test.ts uses a pure stub for better-sqlite3**, not `vi.importActual`. The native binary is compiled against Electron's Node.js (NODE_MODULE_VERSION 143) and cannot load in the Vitest runner (NODE_MODULE_VERSION 137). The stub verifies logger call signatures; SQL correctness is covered by existing integration tests.
- **`lens:start` logs `{ port }` only**, not `{ port, localIp }` as originally specified. localIp is assembled by the caller in `index.ts`. This is an intentional minor deviation — fewer fields in a log entry is strictly better for privacy.
- Lifecycle events in `index.ts` (`app:ready`, `app:quit`, `uncaughtException`, `unhandledRejection`, security block handlers) are not unit-tested. These handlers are single-line logger calls wired to Electron app events; testing them would require running Electron. They are verifiable by the smoke test.

### Patterns to standardise
- All `vi.mock` factories that reference module-level variables must use `vi.hoisted()`. The alternative (arrow function closures) fails for native-addon constructors.
- For native-addon modules (better-sqlite3), use a regular-function stub (`vi.fn(function Stub() { return { ... }; })`) — arrow functions cannot serve as constructors.
