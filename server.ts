import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy Route
  app.get('/api/matches', async (req, res) => {
    try {
      const apiKey = process.env.RAPIDAPI_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'RAPIDAPI_KEY is not configured.' });
      }

      const response = await fetch('https://cricbuzz-cricket.p.rapidapi.com/matches/v1/recent', {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'cricbuzz-cricket.p.rapidapi.com'
        }
      });

      if (!response.ok) throw new Error(`Cricbuzz API error: ${response.statusText}`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to fetch matches' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log('Server running on port 3000'));
}

startServer();
