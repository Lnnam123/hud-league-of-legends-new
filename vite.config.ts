import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import webfontDownload from "vite-plugin-webfont-dl";
import svgLoader from "vite-svg-loader";

let globalHudSettings = {
  skinDisplayEnabled: true,
  skinDisplayTeam: 'both',
  scoreboardBottom: true,
  baronTimer: true,
  dragonTimer: true,
  goldGraph: true,
  compactTeamfight: true,
  smiteReaction: true,
  killFeed: true,
};

function hudControlPlugin() {
  return {
    name: 'vite-plugin-hud-control',
    configureServer(server: any) {
      server.middlewares.use('/api/hud-control', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              globalHudSettings = { ...globalHudSettings, ...data };
              server.ws.send({
                type: 'custom',
                event: 'hud-control:update',
                data: globalHudSettings,
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(globalHudSettings));
            } catch (err) {
              res.writeHead(400);
              res.end();
            }
          });
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(globalHudSettings));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), webfontDownload(), svgLoader(), hudControlPlugin()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/riot-api': {
        target: 'https://127.0.0.1:2999',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/riot-api/, ''),
      },
    },
  },
});
