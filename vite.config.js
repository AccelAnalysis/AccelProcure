import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_PORT || env.PORT || 5173);

  return {
    plugins: [react()],
    publicDir: 'public',
    server: {
      host: '0.0.0.0',
      port,
      strictPort: false,
      open: env.VITE_OPEN_BROWSER === 'false' ? false : true,
      cors: true,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@api': fileURLToPath(new URL('./src/api', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
        '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
        '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      },
    },
    envPrefix: ['VITE_', 'APP_'],
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV || mode),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
    },
    optimizeDeps: {
      include: ['mapbox-gl'],
      esbuildOptions: {
        target: 'es2020',
      },
    },
    build: {
      target: 'es2020',
      sourcemap: true,
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('./index.html', import.meta.url)),
        },
      },
    },
  };
});
