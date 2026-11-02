import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// Certificados locales (mkcert) solo para desarrollo. No se suben al repositorio:
// si no existen, el servidor de desarrollo arranca en HTTP sin fallar.
const keyPath = path.resolve(__dirname, "localhost+2-key.pem");
const certPath = path.resolve(__dirname, "localhost+2.pem");
const isUsable = (file: string) => fs.existsSync(file) && fs.statSync(file).size > 0;
const hasLocalCerts = isUsable(keyPath) && isUsable(certPath);

export default defineConfig(({ command }) => ({
  plugins: [react()],

  server:
    command === "serve"
      ? {
          host: "localhost",
          port: 5173,
          ...(hasLocalCerts
            ? { https: { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) } }
            : {}),
          proxy: {
            "/api": {
              target: "http://localhost:3000",
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
}));
