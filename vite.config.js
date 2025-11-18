// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: parseInt(env.PORT || '3000'),
      open: true,
      strictPort: true,
    },
    publicDir: 'public',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@config': fileURLToPath(new URL('./src/config', import.meta.url)),
        '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      },
    },
    define: {
      'import.meta.env': JSON.stringify(env),
      'process.env': JSON.stringify(env),
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.1.0'),
    },
    optimizeDeps: {
      include: ['mapbox-gl', '@mapbox/mapbox-gl-draw'],
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
        output: {
          manualChunks: {
            vendor: ['mapbox-gl', '@mapbox/mapbox-gl-draw'],
          },
        },
      },
    },
    plugins: [],
    esbuild: {
      jsx: 'automatic',
    },
    envPrefix: 'VITE_',
  };
});