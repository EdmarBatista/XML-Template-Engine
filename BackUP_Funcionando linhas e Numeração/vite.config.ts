import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function standaloneRootPlugin(): Plugin {
  return {
    name: 'standalone-root-output',
    enforce: 'post',
    closeBundle() {
      const distFile = path.resolve(__dirname, 'dist/index.html');
      const targetFile = path.resolve(__dirname, 'app_standalone.html');
      if (fs.existsSync(distFile)) {
        fs.writeFileSync(targetFile, fs.readFileSync(distFile));
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), viteSingleFile(), standaloneRootPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

