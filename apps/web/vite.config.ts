import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Empty prefix: load WEB_PORT / API_PORT too, which are not exposed to the browser.
  // API_PORT is shared with the API through the root .env, and apps/web/.env wins on conflicts.
  const rootDir = fileURLToPath(new URL('../..', import.meta.url));
  const env = { ...loadEnv(mode, rootDir, ''), ...loadEnv(mode, process.cwd(), '') };
  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: Number(env.WEB_PORT) || 5173,
      proxy: {
        '/api': {
          // API_TARGET points the proxy at another API, e.g. the Pi's, to see its data
          target: env.API_TARGET || `http://localhost:${env.API_PORT || 3000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
