import { renderGarage } from '../views/GarageView.js';
import { renderBooking } from '../views/BookingView.js';
import { renderAdmin } from '../views/AdminView.js';
import { renderProfile } from '../views/ProfileView.js';

const routes = {
    '/': renderGarage,
    '/booking': renderBooking,
    '/admin': renderAdmin,
    '/profile': renderProfile,
};

export function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute(); // Első betöltés
}

function handleRoute() {
    const path = window.location.hash.slice(1) || '/';
    const app = document.getElementById('app');

    if (routes[path]) {
        app.innerHTML = ''; // Törlés
        const content = routes[path]();

        if (typeof content === 'string') {
            app.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            app.appendChild(content);
        }
    } else {
        app.innerHTML = '<h1>404 - Nem található</h1>';
    }
}

export function navigate(path) {
    window.location.hash = path;
}
