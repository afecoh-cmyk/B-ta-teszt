import { defineConfig } from 'vite';

export default defineConfig({
    // Alapvető konfiguráció, később itt állítjuk be a PWA plugint
    base: './', // Relatív útvonalak, hogy működjön almappában is
    server: {
        host: true
    }
});
