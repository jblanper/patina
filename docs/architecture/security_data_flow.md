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
-   **`NewCoinSchema`:** Used for creating or updating coins. It uses `.strict()` to forbid any unknown properties, preventing "mass assignment" attacks where a malicious renderer might try to inject fields like `is_admin` or overwrite protected metadata.
-   **`idSchema`:** A simple `z.number().int().positive()` used to validate all ID arguments.
-   **Numismatic Refiners:** We enforce domain-specific logic at the schema level:
    -   **Weight:** Max 2 decimal places (e.g., `17.20`).
    -   **Diameter:** Max 1 decimal place (e.g., `19.5`).

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

### 4.2 Atomic Transactions
All write operations are synchronous and atomic within the Main process, ensuring data integrity even if the Renderer crashes.

---

## 5. Content Security Policy (CSP)

To further harden the Renderer, we enforce a strict CSP via the `helmet` middleware (in the Lens bridge) or meta tags in `index.html`.

-   **Scripts:** `'self'` only. No inline scripts, no external CDNs.
-   **Images:** `'self'` and `patina-img://` (Custom protocol).
-   **Styles:** `'self'` and `'unsafe-inline'` (required for React styled-components/runtime styles, though we aim to minimize this).
-   **Connect:** `'self'` (Localhost only).

---

## 6. Future: Custom Protocol (`patina-img://`)

To securely serve local images without exposing the file system, we will implement a custom protocol handler in the Main process.

-   **Request:** `patina-img://<relative_path>`
-   **Handler:**
    1.  Sanitizes the path (blocks `..` traversal).
    2.  Verifies the file exists in `data/images/`.
    3.  Serves the file with correct MIME type.
    4.  Denies access to any file outside the sanctioned image directory.
