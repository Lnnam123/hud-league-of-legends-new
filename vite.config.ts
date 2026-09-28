import { fileURLToPath, URL } from "node:url";
import os from "node:os";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import webfontDownload from "vite-plugin-webfont-dl";
import svgLoader from "vite-svg-loader";

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

let globalHudSettings = {
  skinDisplayEnabled: false,
  skinDisplayTeam: 'both',
  teamRunesEnabled: false,
  teamRunesTeam: 'both',
  scoreboardBottom: true,
  scoreboardShowChampionNames: false,
  baronTimer: true,
  dragonTimer: true,
  goldGraph: true,
  compactTeamfight: false,
  smiteReaction: true,
  killFeed: true,
};

function hudControlPlugin() {
  return {
    name: 'vite-plugin-hud-control',
    configureServer(server: any) {
      server.middlewares.use('/api/server-info', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        const ip = getLocalIp();
        const port = server.config?.server?.port || 5173;
        res.end(JSON.stringify({
          ip,
          port,
          controlUrl: `http://${ip}:${port}/control`,
          overlayUrl: `http://${ip}:${port}/`,
        }));
      });

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
              if (req.url?.includes('test-kill') || req.url?.includes('test-feed')) {
                server.ws.send({
                  type: 'custom',
                  event: 'hud-control:test-feed',
                  data,
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
                return;
              }
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
    host: true,
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
