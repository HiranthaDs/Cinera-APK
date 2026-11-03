import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [react(),cloudflare({viteEnvironment:{name:'worker'}})],
  environments:{worker:{build:{sourcemap:true}}},
  server:{port:5173,watch:{ignored:['**/.audit/**','**/.wrangler/**','**/docs/**','**/hich-reference*']}},
  preview:{port:4173},
  build:{outDir:'dist',target:'es2018',cssTarget:'chrome61',sourcemap:false,cssCodeSplit:true,chunkSizeWarningLimit:650},
});
