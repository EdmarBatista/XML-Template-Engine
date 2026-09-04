import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import externalGlobals from 'rollup-plugin-external-globals';

function devCdnExternalsPlugin(): Plugin {
  return {
    name: 'dev-cdn-externals',
    enforce: 'pre',
    apply: 'serve',
    resolveId(id) {
      if (id === 'jszip') return '\0virtual:jszip';
      if (id === 'mammoth') return '\0virtual:mammoth';
      if (id === 'docx') return '\0virtual:docx';
      return null;
    },
    load(id) {
      if (id === '\0virtual:jszip') {
        return `
const JSZip = (typeof window !== 'undefined' && window.JSZip) ? window.JSZip : undefined;
export default JSZip;
export { JSZip };
`;
      }
      if (id === '\0virtual:mammoth') {
        return `
const mammoth = (typeof window !== 'undefined' && window.mammoth) ? window.mammoth : undefined;
export default mammoth;
export { mammoth };
`;
      }
      if (id === '\0virtual:docx') {
        return `
const d = (typeof window !== 'undefined' && window.docx) ? window.docx : {};
export default d;
export const AlignmentType = d.AlignmentType;
export const BorderStyle = d.BorderStyle;
export const Document = d.Document;
export const LevelFormat = d.LevelFormat;
export const Packer = d.Packer;
export const Paragraph = d.Paragraph;
export const Table = d.Table;
export const TableCell = d.TableCell;
export const TableRow = d.TableRow;
export const TextRun = d.TextRun;
export const WidthType = d.WidthType;
export const HeadingLevel = d.HeadingLevel;
export const Header = d.Header;
export const Footer = d.Footer;
export const ShadingType = d.ShadingType;
export const PageNumber = d.PageNumber;
export const NumberFormat = d.NumberFormat;
export const ExternalHyperlink = d.ExternalHyperlink;
export const ImageRun = d.ImageRun;
export const SymbolRun = d.SymbolRun;
`;
      }
      return null;
    },
  };
}

function standaloneRootPlugin(): Plugin {
  return {
    name: 'standalone-root-output',
    enforce: 'post',
    async closeBundle() {
      await new Promise(resolve => setTimeout(resolve, 1000));
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
    plugins: [
      devCdnExternalsPlugin(),
      react(),
      tailwindcss(),
      nodePolyfills(),
      viteSingleFile(),
      standaloneRootPlugin()
    ],
    optimizeDeps: {
      exclude: ['docx', 'mammoth', 'jszip', 'jsdom', 'puppeteer', 'undici'],
    },
    build: {
      rollupOptions: {
        external: ['docx', 'mammoth', 'jszip'],
        plugins: [
          externalGlobals({
            docx: 'docx',
            mammoth: 'mammoth',
            jszip: 'JSZip'
          })
        ]
      }
    },
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

