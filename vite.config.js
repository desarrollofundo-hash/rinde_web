import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
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
      host: "10.51.136.4",
      port: 5175,
    },
  },
});
