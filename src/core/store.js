const STORAGE_KEY = 'garazs_app_data';

export const state = {
    cars: [],
    user: null,
    news: []
};

export function initStore() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            state.cars = parsed.cars || [];
            state.user = parsed.user || null;
            state.news = parsed.news || [];
            console.log('Store betöltve:', state);
        } catch (e) {
            console.error('Hiba a mentés olvasásakor:', e);
        }
    } else {
        // Demo adat első indításkor
        console.log('Nincs mentés, demo adatok betöltése...');
    }
}

export function saveStore() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Esemény küldése a változásról, hogy a UI frissülhessen
    document.dispatchEvent(new CustomEvent('store-updated'));
}

export function addCar(car) {
    state.cars.push(car);
    saveStore();
    saveStore();
}

export function deleteCar(plate) {
    state.cars = state.cars.filter(c => c.plate !== plate);
    saveStore();
}

export function updateBookingStatus(bookingId, status) {
    const booking = state.bookings?.find(b => b.id === bookingId);
    if (booking) {
        booking.status = status;
        booking.lastUpdated = new Date();
        saveStore();
    }
}

export function addNews(newsItem) {
    if (!state.news) state.news = [];
    state.news.unshift({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...newsItem
    });
    saveStore();
}

export function deleteNews(id) {
    if (!state.news) return;
    state.news = state.news.filter(item => item.id !== id);
    saveStore();
}
