import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      "/tg-api": {
        target: "https://api.telegram.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tg-api/, ""),
      },
    },
  },
});
