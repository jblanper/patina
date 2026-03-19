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
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  // Multer Config - save to correct location based on environment
  const isDev = !app.isPackaged;
  const imagesDir = isDev
    ? path.join(process.cwd(), 'data', 'images', 'coins')
    : path.join(app.getPath('userData'), 'images', 'coins');
    
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imagesDir);
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
  expressApp.get('/lens-script.js', (req: Request, res: Response) => {
    const scriptPath = path.join(__dirname, 'lens-mobile.js');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(scriptPath);
  });

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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
        <style>
          :root {
            --color-parchment: #FCF9F2;
            --color-ink: #2D2926;
            --color-muted: #A8A6A3;
            --accent: #C27856;
            --error: #B22222;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: var(--color-ink);
            color: var(--color-parchment);
            font-family: 'Cormorant Garamond', Georgia, serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 2rem;
          }
          header {
            margin-bottom: 3rem;
            text-align: center;
          }
          h1 {
            font-weight: 400;
            font-size: 1.75rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
          }
          .subtitle {
            font-size: 0.875rem;
            color: var(--color-muted);
            font-style: italic;
          }
          /* Custom file upload button - input is invisible but functional */
          .file-upload {
            position: relative;
            display: block;
            width: 100%;
            max-width: 320px;
          }
          .file-upload input[type="file"] {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            z-index: 1;
          }
          .file-upload-btn {
            display: block;
            width: 100%;
            padding: 1.25rem 2rem;
            background-color: var(--color-parchment);
            color: var(--color-ink);
            font-family: 'Cormorant Garamond', Georgia, serif;
            font-size: 1.125rem;
            font-weight: 600;
            letter-spacing: 0.05em;
            text-align: center;
            pointer-events: none;
          }
          .file-upload input[type="file"]:active + .file-upload-btn {
            background-color: var(--color-muted);
            color: var(--color-parchment);
          }
          /* Feedback messages */
          #status {
            margin-top: 2rem;
            min-height: 1.5rem;
            font-size: 1rem;
            display: none;
          }
          .uploading { color: var(--color-muted); font-style: italic; }
          .success { 
            color: var(--accent); 
            font-style: normal;
            font-weight: 600;
            font-size: 1.125rem;
          }
          .error { color: var(--error); font-style: italic; }
        </style>
      </head>
      <body>
        <header>
          <h1>Patina Lens</h1>
          <p class="subtitle">Transfer to Ledger</p>
        </header>
        <label class="file-upload">
          <input type="file" accept="image/*" capture="environment">
          <span class="file-upload-btn">Capture Image</span>
        </label>
        <p id="status"></p>
        <script src="/lens-script.js"></script>
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
    
    // Return relative path for patina-img:// protocol (relative to imageRoot which is data/images)
    const baseDir = isDev 
      ? path.join(process.cwd(), 'data', 'images')
      : app.getPath('userData');
    const relativePath = path.relative(baseDir, req.file.path);
    
    if (config.onUpload) {
      config.onUpload(relativePath);
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
