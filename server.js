// server.js
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './src/config/settings.js';
import { registerDashboardRoutes } from './src/api/dashboard-routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static for plugin JS
app.use('/public', express.static(path.join(__dirname, 'public')));

// API routes
registerDashboardRoutes(app);

// Swagger
const openapi = YAML.load(path.join(__dirname, 'openapi.yaml'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customJs: '/public/topbar-plugin.js',
  customSiteTitle: 'Kraken Bot Swagger'
}));

// Root -> /docs
app.get('/', (_req, res) => res.redirect('/docs'));

const PORT = Number(process.env.PORT || CONFIG.port || 10000);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on :${PORT}`);
  console.log(`Swagger at /docs`);
});