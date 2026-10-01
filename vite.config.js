import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import fs from "node:fs";

function serveStaticSrc(srcRelDir, urlPrefix) {
  const srcDir = path.resolve(srcRelDir);
  return {
    name: `serve-src:${urlPrefix}`,
    configureServer(server) {
      // Recargar el browser cuando cambie cualquier archivo de la carpeta
      server.watcher.add(path.join(srcDir, "**/*"));
      server.watcher.on("change", (changedFile) => {
        if (changedFile.startsWith(srcDir)) {
          server.ws.send({ type: "full-reload" });
        }
      });

      server.middlewares.use(urlPrefix, (req, res, next) => {
        const file = req.url === "/" ? "manual.html" : req.url.replace(/^\//, "");
        const filePath = path.join(srcDir, file);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mime = ext === ".html" ? "text/html;charset=utf-8"
                     : ext === ".css"  ? "text/css"
                     : ext === ".js"   ? "application/javascript"
                     : "application/octet-stream";
          res.setHeader("Content-Type", mime);
          res.end(fs.readFileSync(filePath));
        } else {
          next();
        }
      });
    },
    generateBundle() {
      if (!fs.existsSync(srcDir)) return;
      for (const file of fs.readdirSync(srcDir)) {
        const filePath = path.join(srcDir, file);
        if (fs.statSync(filePath).isFile()) {
          this.emitFile({
            type: "asset",
            fileName: `${urlPrefix.replace(/^\//, "")}/${file}`,
            source: fs.readFileSync(filePath),
          });
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    serveStaticSrc("./src/ManualRindeGasto", "/ManualRindeGasto"),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.names?.[0] ?? assetInfo.name ?? "";
          if (name.endsWith(".mjs")) return "assets/[name]-[hash].js";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    hmr: {
      overlay: false,
    },
    // El frontend llama siempre a /api/... (mismo origen). En desarrollo Vite
    // reenvía esas peticiones a server.js, evitando CORS y el problema de
    // "localhost:3001" cuando se abre la app desde otro equipo o celular.
    proxy: {
      "/api": {
        target: process.env.OCR_BACKEND_URL || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
