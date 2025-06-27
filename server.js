import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3333;

// CORS configuration for cross-domain access
app.use(cors({
  origin: '*', // Allow all origins for widget access
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Serve static files from dist directory
app.use('/mchatbot-widget', express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    // Set proper MIME types
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
    
    // Additional CORS headers for static files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Cache control for better performance
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
  }
}));

// Health check endpoint
app.get('/mchatbot-widget/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve the main index.html at the root of the subpath
app.get('/mchatbot-widget', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Handle 404 for the subpath
app.use('/mchatbot-widget/*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: 'The requested resource was not found on this server.'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 MChatBot Widget server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 Access URL: http://localhost:${PORT}/mchatbot-widget`);
  console.log(`🔧 Health check: http://localhost:${PORT}/mchatbot-widget/health`);
});

export default app;