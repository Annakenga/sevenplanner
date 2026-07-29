import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/sevenplanner/",
  plugins: [react()],
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
