# Renderer Isolation & Security Settings

## 1. WebPreferences (The Security Core)
- **`contextIsolation: true`:** Mandatory. Separates the Renderer's JavaScript environment from the Preload script's environment.
- **`nodeIntegration: false`:** Mandatory. Prevents the Renderer from accessing Node.js APIs directly.
- **`sandbox: true`:** Recommended for production. Further isolates the Renderer process from the host OS.
- **`webSecurity: true`:** Mandatory. Enables the same-origin policy and prevents unauthorized resource loading.
- **Experimental Features:** Do not enable `experimentalFeatures` or `blinkFeatures`.

## 2. Content Security Policy (CSP)
- **Concept:** Prevents cross-site scripting (XSS) by restricting where scripts, styles, and other assets can be loaded from.
- **Patina Policy:** Since we are local-only, our policy should be restrictive.
- **Production CSP:**
    ```html
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' file: data:;">
    ```
- **Development CSP (with Vite):**
    If using a development server, you must allow the server URL (e.g., `http://localhost:5173`).
    ```html
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' http://localhost:5173; style-src 'self' 'unsafe-inline' http://localhost:5173; font-src 'self'; img-src 'self' file: data: http://localhost:5173;">
    ```
- **Note:** For production, fonts must be bundled locally.

## 3. Navigation & Session Management
- **Navigation Control:** Prevent the renderer from navigating the top-level window to an arbitrary URL.
  ```typescript
  win.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    if (parsedUrl.origin !== 'http://localhost:5173' && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
  });
  ```
- **Window Open Handler:** Restrict new window creation.
  ```typescript
  win.webContents.setWindowOpenHandler(({ url }) => {
    // Optionally open external URLs in the default browser
    // shell.openExternal(url);
    return { action: 'deny' };
  });
  ```
- **Permission Request Handler:** Deny sensitive permissions by default.
  ```typescript
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Deny camera, mic, geolocation, etc.
    return callback(false);
  });
  ```

## 4. Remote Module
- **Standard:** Do not use the `@electron/remote` module.
- **Alternative:** Always use IPC (`ipcRenderer.invoke` / `ipcMain.handle`).

## 5. Input Sanitization
- **Concept:** All user input must be sanitized before being displayed or used in database queries.
- **Tools:** Use `DOMPurify` for rendering HTML (if needed) and `better-sqlite3`'s prepared statements to prevent SQL injection.
