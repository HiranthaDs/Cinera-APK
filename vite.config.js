import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets:['Chrome >= 49','Android >= 5','Samsung >= 4'],
      renderLegacyChunks:true,
    }),
    cloudflare({viteEnvironment:{name:'worker'}}),
  ],
  environments:{worker:{build:{sourcemap:true}}},
  server:{port:5173,watch:{ignored:['**/.audit/**','**/.wrangler/**','**/docs/**','**/hich-reference*']}},
  preview:{port:4173},
  build:{outDir:'dist',cssTarget:'chrome49',sourcemap:false,cssCodeSplit:true,chunkSizeWarningLimit:700},
});
