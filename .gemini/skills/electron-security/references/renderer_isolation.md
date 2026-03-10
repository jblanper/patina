# Renderer Isolation & Security Settings

## 1. WebPreferences (The Security Core)
- **`contextIsolation: true`:** Mandatory. Separates the Renderer's JavaScript environment from the Preload script's environment.
- **`nodeIntegration: false`:** Mandatory. Prevents the Renderer from accessing Node.js APIs directly.
- **`sandbox: true`:** Recommended for production. Further isolates the Renderer process from the host OS.
- **`webSecurity: true`:** Mandatory. Enables the same-origin policy and prevents unauthorized resource loading.

## 2. Content Security Policy (CSP)
- **Concept:** Prevents cross-site scripting (XSS) by restricting where scripts, styles, and other assets can be loaded from.
- **Patina Policy:** Since we are local-only, our policy should be restrictive:
    ```html
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' file: data:;">
    ```
- **Note:** For production, fonts must be bundled locally to remove the `fonts.googleapis.com` dependency.

## 3. Remote Module
- **Standard:** Do not use the `@electron/remote` module. It is a security risk as it allows the Renderer to manipulate Main process objects directly.
- **Alternative:** Always use IPC (`ipcRenderer.invoke` / `ipcMain.handle`).

## 4. Input Sanitization
- **Concept:** All user input must be sanitized before being displayed or used in database queries.
- **Tools:** Use `DOMPurify` for rendering HTML (if needed) and `better-sqlite3`'s prepared statements to prevent SQL injection.
