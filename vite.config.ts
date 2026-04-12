import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

/**
 * Injects the hashed asset list into sw.js after the build so the service
 * worker can pre-cache the exact app shell files for this deploy.
 */
function swAssetInjector(): Plugin {
  return {
    name: "sw-asset-injector",
    apply: "build",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (!fs.existsSync(swPath)) return;

      // Collect all hashed JS/CSS/HTML assets from dist
      const distAssetsDir = path.resolve(__dirname, "dist/assets");
      const assets: string[] = ["/", "/index.html"];

      if (fs.existsSync(distAssetsDir)) {
        fs.readdirSync(distAssetsDir).forEach((file) => {
          if (/\.(js|css)$/.test(file)) {
            assets.push(`/assets/${file}`);
          }
        });
      }

      const sw = fs.readFileSync(swPath, "utf-8");
      const injected = sw.replace(
        "self.__PRECACHE_ASSETS__ || ['/']",
        JSON.stringify(assets)
      );
      fs.writeFileSync(swPath, injected);
      console.log(`[sw-asset-injector] Injected ${assets.length} assets into sw.js`);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    swAssetInjector(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
}));
