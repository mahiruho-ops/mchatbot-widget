import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Test the subpath configuration
app.use('/mchatbot-widget', express.static(path.join(__dirname, 'dist')));

// Health check
app.get('/mchatbot-widget/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Subpath handling is working correctly!'
  });
});

// Demo page
app.get('/mchatbot-widget', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Test endpoint to show all available routes
app.get('/mchatbot-widget/routes', (req, res) => {
  res.json({
    available_routes: [
      'GET /mchatbot-widget/ - Demo page',
      'GET /mchatbot-widget/health - Health check',
      'GET /mchatbot-widget/mchatbot.js - Widget script',
      'GET /mchatbot-widget/index.js - Vite polyfill',
      'GET /mchatbot-widget/routes - This endpoint'
    ],
    static_files: [
      'index.html',
      'mchatbot.js',
      'index.js'
    ]
  });
});

// 404 handler for the subpath
app.use('/mchatbot-widget/*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    requested_path: req.path,
    available_routes: [
      '/mchatbot-widget/',
      '/mchatbot-widget/health',
      '/mchatbot-widget/mchatbot.js',
      '/mchatbot-widget/routes'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'dist')}`);
  console.log(`🌐 Test URLs:`);
  console.log(`   - Demo: http://localhost:${PORT}/mchatbot-widget/`);
  console.log(`   - Health: http://localhost:${PORT}/mchatbot-widget/health`);
  console.log(`   - Widget: http://localhost:${PORT}/mchatbot-widget/mchatbot.js`);
  console.log(`   - Routes: http://localhost:${PORT}/mchatbot-widget/routes`);
});

export default app; 