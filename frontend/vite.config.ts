import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [react()],

  server:
    command === "serve"
      ? {
          host: "localhost",
          port: 5173,
          https: {
            key: fs.readFileSync(path.resolve(__dirname, "localhost+2-key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "localhost+2.pem")),
          },
          proxy: {
            "/api": {
              target: "https://localhost:3000",
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
}));