/**
 * API Documentation Routes
 * Serves OpenAPI spec and Swagger UI
 */

import { Router } from 'express';
import { openApiSpec } from '../docs/openapi.js';

const router = Router();

/**
 * GET /docs/openapi.json
 * Returns the OpenAPI specification
 */
router.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

/**
 * GET /docs
 * Serves Swagger UI
 */
router.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Perfect Catch CRM API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout',
        deepLinking: true,
        showExtensions: true,
        showCommonExtensions: true
      });
    };
  </script>
</body>
</html>
  `.trim();
  
  res.set('Content-Type', 'text/html');
  res.send(html);
});

export default router;
