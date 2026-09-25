import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    cssCodeSplit: false,
    sourcemap: false,
    minify: true,
    outDir: "dist",
    emptyOutDir: false,
    assetsInlineLimit: 100000000,
    rollupOptions: {
      input: "widget/index.html",
    },
  },
});
