import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

/** Copy pdfjs legacy worker into public/ for Capacitor APK (Chrome 61 / Android 8). */
function copyPdfLegacyWorker(): Plugin {
  return {
    name: "copy-pdf-legacy-worker",
    apply: "build",
    buildStart() {
      if (process.env.CAPACITOR !== "true") return;
      const candidates = [
        "legacy/build/pdf.worker.min.js",
        "legacy/build/pdf.worker.js",
        "build/pdf.worker.min.js",
      ];
      const pkgRoot = path.resolve(__dirname, "node_modules/pdfjs-dist");
      let src: string | null = null;
      for (const rel of candidates) {
        const p = path.join(pkgRoot, rel);
        if (fs.existsSync(p)) {
          src = p;
          break;
        }
      }
      if (!src) {
        console.warn("[copy-pdf-legacy-worker] pdf.worker not found in pdfjs-dist");
        return;
      }
      const dest = path.resolve(__dirname, "public/pdf.worker.min.js");
      fs.copyFileSync(src, dest);
      console.log(`[copy-pdf-legacy-worker] Copied ${path.basename(src)} → public/pdf.worker.min.js`);
    },
  };
}

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
        JSON.stringify(assets),
      );
      fs.writeFileSync(swPath, injected);
      console.log(
        `[sw-asset-injector] Injected ${assets.length} assets into sw.js`,
      );
    },
  };
}

/** Fix font URLs in bundled CSS for Capacitor (CSS lives in /assets/, fonts in /fonts/) */
function capacitorFontPaths(): Plugin {
  return {
    name: "capacitor-font-paths",
    apply: "build",
    closeBundle() {
      if (process.env.CAPACITOR !== "true") return;
      const assetsDir = path.resolve(__dirname, "dist/assets");
      if (!fs.existsSync(assetsDir)) return;
      for (const file of fs.readdirSync(assetsDir)) {
        if (!file.endsWith(".css")) continue;
        const filePath = path.join(assetsDir, file);
        const css = fs.readFileSync(filePath, "utf-8");
        fs.writeFileSync(
          filePath,
          css.replace(/url\(\/fonts\//g, "url(../fonts/"),
        );
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isCapacitorBuild = process.env.CAPACITOR === "true";

  return {
    base: isCapacitorBuild ? "./" : "/",
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: false,
      hmr: {
        overlay: false,
      },
      watch: {
        usePolling: false,
        ignored: ["**/node_modules/**", "**/dist/**", "**/public/pdf.worker.min.js"],
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "lucide-react",
        "@tanstack/react-query",
        "date-fns",
        "clsx",
        "tailwind-merge",
      ],
      holdUntilCrawl: false,
    },
    build: {
      sourcemap: false,
      minify: true,
      target: "es2015", // Better compatibility with older Android WebViews
      cssTarget: "chrome61", // Android 8 uses Chrome 61 WebView
    },
    plugins: [
      react(),
      copyPdfLegacyWorker(),
      swAssetInjector(),
      capacitorFontPaths(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        react: path.resolve(__dirname, "./node_modules/react"),
        "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      },
    },
  };
});
