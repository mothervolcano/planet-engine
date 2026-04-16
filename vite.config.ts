import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PlanetEngine",
      fileName: "planet-engine",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["@mothervolcano/topo"],
    },
    sourcemap: true,
    minify: false,
  },
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
