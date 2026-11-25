import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Shared app modules (`@app/...`) import their siblings as `@/lib/*`.
      // Keep `@` pointing at this admin, but route the one shared sibling that
      // only exists in the app source tree back there.
      {
        find: /^@\/lib\/subjects-data$/,
        replacement: path.resolve(__dirname, '../src/lib/subjects-data'),
      },
      { find: /^@$/, replacement: path.resolve(__dirname, './src') },
      { find: /^@app$/, replacement: path.resolve(__dirname, '../src') },
      { find: /^@\//, replacement: path.resolve(__dirname, './src') + '/' },
      { find: /^@app\//, replacement: path.resolve(__dirname, '../src') + '/' },
    ],
  },
});
