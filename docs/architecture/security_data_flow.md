# Architecture: Security & Data Flow ("The Filter")

**Version:** 1.0  
**Last Updated:** 2026-03-13  
**Status:** Active

This document outlines the security architecture of the Patina application, specifically focusing on the "Filter" principle that governs all data exchange between the Renderer (UI) and the Main (System) process.

---

## 1. Core Principle: "The Filter"

In Electron applications, the Renderer process (where React lives) is considered **untrusted**. It can be compromised by XSS attacks if it loads external content (though we block this via CSP). Therefore, the Main process must never blindly trust instructions or data from the Renderer.

**"The Filter"** is a mandatory validation layer that sits at the entry point of the Main process. It rejects any data that does not strictly conform to pre-defined schemas.

### The Flow of Trust
1.  **Renderer (Untrusted):** User inputs data or requests an action.
2.  **Context Bridge (Sanitized):** Data passes through specific, typed functions exposed in `preload.ts`.
3.  **IPC Bridge (Transport):** Electron serializes the message.
4.  **The Filter (Validation):** Main process immediately validates the payload against Zod schemas.
5.  **Database (Trusted):** Only validated, structured data is executed against `better-sqlite3`.

---

## 2. Validation Layer (Zod)

We use **Zod** to define strict schemas that are shared between both processes. This ensures that the types used in the UI match the validation logic in the backend.

**Location:** `src/common/validation.ts`

### 2.1 Shared Schemas

| Schema | Purpose |
| :--- | :--- |
| `NewCoinSchema` | Coin creation/update. Uses `.strict()` to forbid unknown properties (prevents mass assignment). |
| `NewCoinImageSchema` | Image creation. Uses `.strict()` and validates path format. |
| `FilterStateSchema` | Gallery filter state (era, metal, grade arrays, searchTerm, sortBy, sortAsc). |
| `ExportOptionsSchema` | ZIP export options with path traversal prevention via `z.refine()`. |
| `VocabGetSchema` | Vocabulary retrieval: `field` (allowlisted) + optional `locale`. |
| `VocabAddSchema` | Vocabulary entry creation: `field` + `value` (max 200 chars, regex validated) + `locale`. |
| `VocabSearchSchema` | Vocabulary search: `field` + `query` + `locale`. |
| `VocabIncrementSchema` | Usage counter increment: `field` + `value`. |
| `VocabResetSchema` | Vocabulary reset: optional `field`. |
| `PreferenceGetSchema` | Preference retrieval: `key` whitelisted to `'language'` only. |
| `PreferenceSetSchema` | Preference write: `key: 'language'`, `value: 'en' \| 'es'`. |

All schemas use `.strict()` where applicable. `ALLOWED_VOCAB_FIELDS` (`metal`, `denomination`, `grade`, `era`, `die_axis`, `mint`) is enforced via `z.enum()` — unknown field names are rejected.

**Numismatic Refiners:** Domain-specific logic enforced at schema level:
-   **Weight:** Max 2 decimal places (e.g., `17.20`).
-   **Diameter:** Max 1 decimal place (e.g., `19.5`).

**Preference key whitelisting:** `PreferenceGetSchema` and `PreferenceSetSchema` constrain `key` to the string literal `'language'`. Any other key string is rejected before reaching the database.

### 2.2 Implementation in Main
In `src/main/db.ts`, every exposed method wraps its logic in a validation step:

```typescript
function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

// Example Usage
addCoin: (coin: NewCoin): number => {
  const validated = validate(NewCoinSchema, coin);
  // Only use 'validated' data from this point forward
  ...
}
```

---

## 3. IPC Bridge Pattern

We strictly adhere to the `contextIsolation: true` and `sandbox: true` standard.

### 3.1 What is Banned?
-   ❌ **Raw SQL:** The Renderer must NEVER send SQL strings (e.g., `SELECT * FROM coins`).
-   ❌ **Node.js Primitives:** The Renderer has no access to `fs`, `path`, or `require`.
-   ❌ **Generic Invokers:** Patterns like `ipcRenderer.invoke('do-thing', ...args)` are hidden behind typed functions in `preload.ts`.

### 3.2 The Safe Bridge
The `preload.ts` exposes a specific API (`window.electronAPI`) that acts as a contract:

```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  getCoins: () => ipcRenderer.invoke('db:get-coins'),
  addCoin: (coin: NewCoin) => ipcRenderer.invoke('db:add-coin', coin),
  // ...
});
```

---

## 4. Database Isolation

The database (`patina.db`) is managed exclusively by the Main process using `better-sqlite3`.

### 4.1 File System Safety
-   **Relative Paths:** The database stores image paths relative to the `data/images` directory (e.g., `ancient/athens_owl.jpg`).
-   **Path Resolution:** The Main process resolves these paths against the user's data directory. The Renderer never sees or manipulates full system paths.

### 4.2 Image Deduplication — Defense-in-Depth

Preventing duplicate image records requires three coordinated layers:

1. **Hook-level guard:** `useCoinForm` maintains an `existingImagePaths` Set. Before submission, new image paths are filtered against this set — already-stored paths are excluded from the `addImage` call.
2. **Database constraint:** The `images` table has a `UNIQUE(coin_id, path)` index. Any duplicate that slips through the hook layer is rejected by the DB.
3. **Safe insert:** `db.addImage()` uses `INSERT OR IGNORE` and returns the existing row's ID on conflict, so callers receive a valid ID without an error.

This pattern — hook filter → DB constraint → safe insert — should be applied to any future relation that risks duplication on repeated saves.

### 4.3 Atomic Transactions
All write operations are synchronous and atomic within the Main process, ensuring data integrity even if the Renderer crashes.

---

## 5. Content Security Policy (CSP)

To further harden the Renderer, we enforce a strict CSP via the `helmet` middleware (in the Lens bridge) or meta tags in `index.html`.

-   **Scripts:** `'self'` only. No inline scripts, no external CDNs.
-   **Images:** `'self'` and `patina-img://` (Custom protocol).
-   **Styles:** `'self'` and `'unsafe-inline'` (required for React styled-components/runtime styles, though we aim to minimize this).
-   **Connect:** `'self'` (Localhost only).

---

## 6. Custom Protocol (`patina-img://`)

To securely serve local images without exposing the file system, we will implement a custom protocol handler in the Main process.

-   **Request:** `patina-img://<relative_path>`
-   **Handler:**
    1.  Sanitizes the path (blocks `..` traversal).
    2.  Verifies the file exists in `data/images/`.
    3.  Serves the file with correct MIME type.
    4.  Denies access to any file outside the sanctioned image directory.

---

## 7. The Lens Express Bridge (Local Network)

Phase 4 introduces a local network entry point via an Express.js server. This allows mobile devices to upload images directly to the desktop application.

### 7.1 "The Filter" for Lens
Because this server is accessible on the local network, it must implement an even more rigorous version of "The Filter":

1.  **Network Isolation:** The server binds only to the local network interface (e.g., `192.168.1.x`) and is only active when the user explicitly opens the "Lens" modal.
2.  **Session Tokens:** Every Lens session generates a unique UUID. This token is embedded in the QR code and must be included in all mobile requests (e.g., `POST /lens/:token/upload`).
3.  **Strict Multipart Validation:** We use `multer` to enforce:
    -   **File Type:** `['image/jpeg', 'image/png', 'image/webp']` only.
    -   **File Size:** Maximum 10MB per upload.
4.  **Content Security Policy (CSP):** The mobile web app served by Lens includes a strict CSP to prevent any external script execution.

### 7.2 Data Handover
Once an image is validated and saved to `data/images/temp/`, the Main process notifies the Renderer via an IPC event (`lens:image-received`). The Renderer then handles the final association with a coin record, ensuring the core database remains isolated from the network bridge.

