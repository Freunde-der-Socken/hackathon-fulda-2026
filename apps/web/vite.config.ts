import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Empty prefix: load WEB_PORT / API_PORT too, which are not exposed to the browser
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: Number(env.WEB_PORT) || 5173,
      proxy: {
        '/api': { target: `http://localhost:${env.API_PORT || 3000}`, changeOrigin: true },
      },
    },
  };
});
