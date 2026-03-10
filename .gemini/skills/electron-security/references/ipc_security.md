# Electron IPC Security Standards

## 1. IPC Name-spacing
- **Standard:** Use a consistent prefix for related handlers (e.g., `db:get-coins`, `fs:save-image`).
- **Convention:** Use kebab-case for the action name.

## 2. Main-side Validation (Mandatory)
- **Concept:** Never trust the Renderer. Every IPC call must be validated in the Main process.
- **Rules:**
    - **IDs:** Verify that IDs are positive integers.
    - **Paths:** Never accept absolute paths from the Renderer. If the Renderer needs to save a file, the Main process should determine the safe destination (e.g., within `userData`).
    - **Payloads:** Use type guards or validation libraries (like `zod`) to ensure objects match the expected schema.

## 3. Preload Bridge (Principle of Least Privilege)
- **Standard:** Do not expose `ipcRenderer` directly.
- **Bridge Pattern:**
    ```typescript
    // Secure Bridge
    contextBridge.exposeInMainWorld('api', {
      saveCoin: (data: NewCoin) => ipcRenderer.invoke('db:save-coin', data),
    });
    ```
- **Dangerous Patterns:** Never expose `ipcRenderer.send`, `ipcRenderer.on`, or any raw Node modules (`fs`, `path`) to the Renderer.

## 4. Error Handling
- **Security:** Do not return raw stack traces or internal database errors to the Renderer.
- **Convention:** Return a sanitized error message or a status code.
