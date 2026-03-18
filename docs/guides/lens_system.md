# Lens Subsystem Reference

The Lens subsystem allows for a direct, local network bridge between a mobile device and the Patina desktop application. It eliminates the need for cloud-based file transfers.

## Components

### 1. The Express Server (`src/main/server.ts`)
A lightweight Express.js server hosted within the Main process. It is only active when a Lens session is explicitly started.

#### Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/lens/:token` | Serves the mobile web app (HTML/CSS). |
| `POST` | `/lens/:token/upload` | Receives a `multipart/form-data` image upload. |

#### Security Features
- **UUID Tokens:** Each session generates a unique `token` that is required in all URLs.
- **Multipart Filter:** `multer` validates that only `image/jpeg`, `image/png`, and `image/webp` files under 10MB are accepted.

---

### 2. The Mobile Web App (Inlined)
A minimal, responsive HTML template served directly by the Main process.

#### Styling
- Follows the "Manuscript Hybrid" aesthetic (Parchment background, Iron Gall Ink text).
- Uses `Cormorant Garamond` and `Montserrat` (served locally if possible, or fallback).
- Responsive grid for image previews.

---

### 3. IPC Handlers

The Renderer interacts with the Lens system through these IPC calls:

| Channel | Action | Returns |
| :--- | :--- | :--- |
| `lens:start` | Initializes the server on a local port. | `{ url: string, status: 'active' }` |
| `lens:stop` | Terminates the server and cleans up temp files. | `void` |
| `lens:get-status` | Checks if the server is currently running. | `{ status: 'active' | 'inactive' }` |

---

### 4. Events (Main to Renderer)

| Channel | Payload | Description |
| :--- | :--- | :--- |
| `lens:image-received` | `{ path: string, thumbnail: string }` | Emitted when a mobile upload is successful. |

## Data Storage

Uploaded images are temporarily stored in `data/images/temp/` before they are finalized and moved to their permanent subdirectories within `data/images/`.

## Errors
- `ERR_LENS_PORT_IN_USE`: The server could not start because the selected port is occupied.
- `ERR_LENS_INVALID_TOKEN`: An upload request was received with an incorrect or expired session token.
- `ERR_LENS_UPLOAD_REJECTED`: The uploaded file failed validation (wrong type or size).
