import express, { Express, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { app } from 'electron'; // For user data path

// Types
interface ServerConfig {
  port?: number;
  onUpload?: (filePath: string) => void;
}

interface ServerInstance {
  app: Express;
  start: () => Promise<{ port: number; token: string; url: string }>;
  stop: () => void;
}

export function createLensServer(config: ServerConfig = {}): ServerInstance {
  const expressApp = express();
  let server: any = null;
  let activeToken: string | null = null;
  
  // Rate Limiting (Security Mandate)
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  expressApp.use(limiter);

  // Security Headers (CSP Mandate)
  expressApp.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Multer Config (The Filter)
  const uploadDir = path.join(app.getPath('userData'), 'images', 'temp');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Sanitize filename (Security Mandate)
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname).toLowerCase();
      // Only allow specific extensions
      if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        return cb(new Error('Invalid file extension'), '');
      }
      cb(null, `lens-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images are allowed'));
      }
    }
  });

  // Routes
  expressApp.get('/lens/:token', (req: Request, res: Response) => {
    if (req.params.token !== activeToken) {
      return res.status(403).send('Invalid or expired session.');
    }
    
    // Mobile UI (Manuscript Hybrid Aesthetic)
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Patina Lens</title>
        <style>
          :root {
            --color-parchment: #FCF9F2;
            --color-ink: #2D2926;
            --font-serif: 'Georgia', serif; /* Fallback for Cormorant */
          }
          body {
            background-color: var(--color-ink);
            color: var(--color-parchment);
            font-family: var(--font-serif);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          h1 { margin-bottom: 2rem; font-weight: normal; letter-spacing: 1px; }
          .upload-btn {
            background-color: var(--color-parchment);
            color: var(--color-ink);
            padding: 1rem 2rem;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            border-radius: 4px;
            text-decoration: none;
          }
          input[type="file"] { display: none; }
        </style>
      </head>
      <body>
        <h1>Patina Lens</h1>
        <label class="upload-btn">
          Capture / Upload
          <input type="file" accept="image/*" capture="environment" onchange="uploadFile(this)">
        </label>
        <p id="status"></p>
        <script>
          async function uploadFile(input) {
            const file = input.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('image', file);
            
            document.getElementById('status').innerText = 'Uploading...';
            
            try {
              const res = await fetch(window.location.href + '/upload', {
                method: 'POST',
                body: formData
              });
              if (res.ok) {
                document.getElementById('status').innerText = 'Added to Ledger.';
                input.value = ''; // Reset
              } else {
                document.getElementById('status').innerText = 'Error: ' + res.statusText;
              }
            } catch (e) {
              document.getElementById('status').innerText = 'Upload failed.';
            }
          }
        </script>
      </body>
      </html>
    `;
    res.send(html);
  });

  expressApp.post('/lens/:token/upload', upload.single('image'), (req: Request, res: Response) => {
    if (req.params.token !== activeToken) {
      return res.status(403).send('Invalid session.');
    }
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    
    if (config.onUpload) {
      config.onUpload(req.file.path);
    }
    
    res.status(200).send('Upload successful');
  });

  return {
    app: expressApp,
    start: async () => {
      return new Promise((resolve, reject) => {
        // Find a random port or use 0 for OS assigned
        const listener = expressApp.listen(0, '0.0.0.0', () => {
          const address = listener.address();
          if (typeof address === 'object' && address !== null) {
             const port = address.port;
             activeToken = uuidv4();
             
             // Import getLocalIp dynamically or use loopback for dev if needed
             // For now, we assume this runs in Main process context where we can use require/import
             // But we need to pass the IP back.
             // We'll rely on the caller (main/index.ts) to get the IP using src/main/ip.ts
             
             server = listener;
             resolve({ port, token: activeToken, url: '' }); // URL constructed by caller
          } else {
            reject(new Error('Failed to get server address'));
          }
        });
      });
    },
    stop: () => {
      if (server) {
        server.close();
        server = null;
        activeToken = null;
      }
    }
  };
}
