import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8',
  '.pfr': 'application/octet-stream',
};

function serveExtractedAssets(): Plugin {
  const extractedRoot = path.resolve(__dirname, '../extracted');
  const mapRoot = (urlPath: string): string | null => {
    const clean = urlPath.split('?')[0];
    for (const game of ['rescueblade', 'bermuda'] as const) {
      const prefix = `/assets/${game}/`;
      if (clean.startsWith(prefix)) {
        const rel = clean.slice(prefix.length);
        const full = path.resolve(extractedRoot, game, 'assets', rel);
        if (full.startsWith(extractedRoot) && fs.existsSync(full) && fs.statSync(full).isFile()) {
          return full;
        }
      }
    }
    return null;
  };

  return {
    name: 'serve-extracted-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const hit = req.url ? mapRoot(req.url) : null;
        if (!hit) return next();
        const ext = path.extname(hit).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
        fs.createReadStream(hit).pipe(res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const hit = req.url ? mapRoot(req.url) : null;
        if (!hit) return next();
        const ext = path.extname(hit).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
        fs.createReadStream(hit).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [serveExtractedAssets()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
  },
});
