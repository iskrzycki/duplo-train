import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "web",
  plugins: [react()],
  server: { port: Number(process.env.PORT ?? 5173) },
});
