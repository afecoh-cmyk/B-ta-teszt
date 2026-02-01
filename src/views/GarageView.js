import { state, addCar } from '../core/store.js';
import { createTile } from '../components/Tile.js';
import { navigate } from '../core/router.js';

export function renderGarage() {
    const container = document.createElement('div');

    const header = document.createElement('div');
    header.style.marginBottom = '24px';
    header.innerHTML = `
    <h1 style="font-size: 2rem; font-weight: 700;">Garázs</h1>
    <p style="color: var(--color-text-muted);">Jó újra látni, Feco!</p>
  `;
    container.appendChild(header);

    // Visszaszámláló a következő foglaláshoz
    const nextBooking = getNextBooking();
    if (nextBooking) {
        const countdownEl = document.createElement('div');
        countdownEl.style.cssText = `
      background: linear-gradient(135deg, var(--color-accent), #4facfe);
      padding: 16px;
      border-radius: var(--radius-tile);
      margin-bottom: 24px;
      text-align: center;
      color: white;
    `;
        countdownEl.innerHTML = `
      <div style="font-size: 0.9rem; opacity: 0.9;">Következő foglalás</div>
      <div style="font-size: 1.5rem; font-weight: 700; margin: 8px 0;" id="countdown-display">
        Számolás...
      </div>
      <div style="font-size: 0.85rem; opacity: 0.8;">
        ${nextBooking.date} ${nextBooking.time} - ${nextBooking.service.name}
      </div>
      <div id="status-display" style="margin-top: 8px; font-weight: 600;"></div>
    `;
        container.appendChild(countdownEl);

        // Visszaszámláló frissítése másodpercenként
        import('../utils/calendar.js').then(({ calculateCountdown }) => {
            const updateCountdown = () => {
                const countdown = calculateCountdown(nextBooking.date, nextBooking.time);
                const display = document.getElementById('countdown-display');
                const statusDisplay = document.getElementById('status-display');

                if (display) {
                    if (countdown.expired) {
                        display.textContent = 'Lejárt';
                    } else {
                        display.textContent = countdown.text;
                    }
                }

                // Státusz megjelenítése
                if (statusDisplay && nextBooking.status) {
                    const statusText = {
                        'pending': '',
                        'on_way': '🚗 Úton vagyok',
                        'arrived': '📍 Megérkeztem',
                        'in_progress': '🔧 Folyamatban',
                        'completed': '✅ Kész'
                    };
                    statusDisplay.textContent = statusText[nextBooking.status] || '';
                }
            };

            updateCountdown();
            setInterval(updateCountdown, 1000);
        });
    }

    // Grid konténer
    const grid = document.createElement('div');
    grid.className = 'tile-grid';
    container.appendChild(grid);

    // Autók renderelése
    if (state.cars.length === 0) {
        // ÜRES ÁLLAPOT: "Adj hozzá autót" csempe (Nagy)
        const addCarTile = createTile({
            title: 'Parkold le az autódat',
            subtitle: 'Koppints ide az első autód felvételéhez',
            icon: '🚗',
            size: 'full',
            variant: 'accent',
            onClick: () => {
                // Gyors autó hozzáadás demo
                const plate = prompt('Írd be a rendszámot (pl. ABC-123):');
                if (plate) {
                    addCar({ plate, type: 'Ismeretlen', addedAt: new Date() });
                    // Újrarenderelés (egyszerű mód: teljes nézet frissítés)
                    // A store event listener jobb lenne, de most egyszerűsítünk:
                    document.dispatchEvent(new CustomEvent('store-updated'));
                }
            }
        });
        // Kiemelés színnel
        addCarTile.style.border = '1px solid var(--color-accent)';
        addCarTile.style.boxShadow = '0 0 15px rgba(96, 205, 255, 0.2)';

        grid.appendChild(addCarTile);
    } else {
        // AUTÓK LISTÁZÁSA
        state.cars.forEach(car => {
            const carTile = createTile({
                title: car.plate,
                subtitle: car.type || 'Személyautó',
                icon: '🚘',
                size: 'full', // Később lehet large, ha több van
                onClick: () => {
                    navigate('/booking');
                }
            });
            grid.appendChild(carTile);
        });

        // "Új autó hozzáadása" kicsi csempe
        const plusTile = createTile({
            title: 'Új autó',
            icon: '➕',
            size: 'medium',
            onClick: () => {
                const plate = prompt('Új rendszám:');
                if (plate) addCar({ plate, type: 'Egyéb' });
            }
        });
        grid.appendChild(plusTile);
    }

    // Statikus Menü Csempék
    const adminTile = createTile({
        title: 'Admin',
        subtitle: 'Munkalista',
        icon: '⚙️',
        size: 'medium',
        onClick: () => navigate('/admin')
    });
    grid.appendChild(adminTile);

    const historyTile = createTile({
        title: 'Előzmények',
        subtitle: 'Korábbi tisztítások',
        icon: '📅',
        size: 'medium',
        onClick: () => alert('Előzmények listája itt lesz')
    });
    grid.appendChild(historyTile);

    const profileTile = createTile({
        title: 'Profil',
        icon: '👤',
        size: 'medium',
        onClick: () => alert('Profil beállítások')
    });
    grid.appendChild(profileTile);

    // Re-render listener (hogy frissüljön ha adat változik)
    const updateHandler = () => {
        // Nagyon basic: újra hívjuk a routert ami újraépíti a DOM-ot
        // Élesben ezt VirtualDOM vagy okosabb update kezeli
        window.dispatchEvent(new Event('hashchange'));
    };

    // Takarítás: elvileg le kellene szedni, ha elhagyjuk a nézetet, 
    // de most MVP-ben globális eseményként kezeljük a routerben vagy itt hagyjuk.
    // A router replace logic miatt ez többszörös listenerhez vezethet, de MVP-re ok.
    document.addEventListener('store-updated', updateHandler, { once: true });

    return container;
}

// Segédfüggvény: következő foglalás keresése
function getNextBooking() {
    if (!state.bookings || state.bookings.length === 0) return null;

    const now = new Date();
    const upcoming = state.bookings
        .filter(b => b.status !== 'completed')
        .map(b => ({
            ...b,
            datetime: new Date(`${b.date}T${b.time}:00`)
        }))
        .filter(b => b.datetime > now)
        .sort((a, b) => a.datetime - b.datetime);

    return upcoming[0] || null;
}
