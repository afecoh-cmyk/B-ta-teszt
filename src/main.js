import './style.css';
import { initRouter } from './core/router.js';
import { initStore } from './core/store.js';

// Inicializálás
document.addEventListener('DOMContentLoaded', () => {
    console.log('Garázs App Indulása...');

    // Store betöltése
    initStore();

    // Router indítása (ez fogja kirajzolni a kezdőnézetet)
    initRouter();
});
