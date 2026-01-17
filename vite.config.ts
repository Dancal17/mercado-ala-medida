import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), {
      name: 'save-constants-middleware',
      configureServer(server) {
        // Middleware 1: Save Constants
        server.middlewares.use('/api/save-constants', async (req, res, next) => {
          if (req.method === 'POST') {
            // ... existing logic ...
            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', () => {
              try {
                const filePath = path.resolve(__dirname, 'constants.ts');
                fs.writeFileSync(filePath, body);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: String(e) }));
              }
            });
          } else {
            next();
          }
        });

        // Middleware 2: Mercado Pago Preference
        server.middlewares.use('/api/create-preference', async (req, res, next) => {
          if (req.method === 'POST') {
            console.log('💰 [Middleware] Iniciando creación de preferencia...');
            const accessToken = process.env.MP_ACCESS_TOKEN || env.MP_ACCESS_TOKEN;
            if (!accessToken) {
              console.error('❌ [Middleware] Falta MP_ACCESS_TOKEN');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Falta configurar credenciales en .env.local' }));
              return;
            }

            const client = new MercadoPagoConfig({ accessToken });
            const preference = new Preference(client);

            let body = '';
            req.on('data', chunk => body += chunk.toString());
            req.on('end', async () => {
              try {
                console.log('📦 [Middleware] Body recibido:', body);
                const { items, payer } = JSON.parse(body);
                const result = await preference.create({
                  body: {
                    items: items,
                    payer: payer,
                    back_urls: {
                      success: "http://localhost:3000",
                      failure: "http://localhost:3000",
                      pending: "http://localhost:3000"
                    },
                    // auto_return: "approved",
                  }
                });
                console.log('✅ [Middleware] Preferencia creada:', result.id);
                res.statusCode = 200;
                // Return the sandbox_init_point for automatic redirection
                res.end(JSON.stringify({
                  id: result.id,
                  init_point: result.sandbox_init_point
                }));
              } catch (error: any) {
                console.error('❌ [Middleware] Error Mercado Pago Full:', JSON.stringify(error, null, 2));

                // Try to extract the most useful message
                const errorMessage = error.message || error.cause?.description || JSON.stringify(error);

                res.statusCode = 500;
                res.end(JSON.stringify({
                  error: errorMessage,
                  details: error
                }));
              }
            });
          } else {
            next();
          }
        });
      }
    }],
    define: {
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
