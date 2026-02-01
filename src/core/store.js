const STORAGE_KEY = 'garazs_app_data';

export const state = {
    cars: [],
    user: null
};

export function initStore() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            state.cars = parsed.cars || [];
            state.user = parsed.user || null;
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
}

export function updateBookingStatus(bookingId, status) {
    const booking = state.bookings?.find(b => b.id === bookingId);
    if (booking) {
        booking.status = status;
        booking.lastUpdated = new Date();
        saveStore();
    }
}
