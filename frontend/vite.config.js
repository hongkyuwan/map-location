import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        // Docker Compose 내부 네트워크에서 backend 컨테이너로 직접 전달.
        // 브라우저는 5173(프론트엔드) 포트 하나만 접속하면 되므로, Codespaces에서
        // 8000 포트를 별도로 공개(Public)할 필요가 없어진다.
        target: "http://backend:8000",
        changeOrigin: true,
      },
    },
  },
});
