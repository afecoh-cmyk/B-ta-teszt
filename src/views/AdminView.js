import { state, updateBookingStatus } from '../core/store.js';
import { createTile } from '../components/Tile.js';

export function renderAdmin() {
    const container = document.createElement('div');

    const header = document.createElement('div');
    header.style.marginBottom = '24px';
    header.innerHTML = `
    <button onclick="window.location.hash='/'" style="
      background: none;
      border: none;
      color: var(--color-accent);
      cursor: pointer;
      font-size: 1.5rem;
      padding: 0;
      margin-bottom: 8px;
    ">← Vissza</button>
    <h1 style="font-size: 2rem; font-weight: 700;">Admin Panel</h1>
    <p style="color: var(--color-text-muted);">Napi munkalista</p>
  `;
    container.appendChild(header);

    // Mai foglalások szűrése
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = (state.bookings || []).filter(b =>
        b.date === today && b.status !== 'completed'
    ).sort((a, b) => a.time.localeCompare(b.time));

    if (todayBookings.length === 0) {
        container.innerHTML += `
      <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
        <h2>Nincs mai munka</h2>
        <p>Élvezd a szabadnapot! 🎉</p>
      </div>
    `;
        return container;
    }

    // Munkalista
    const list = document.createElement('div');
    list.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

    todayBookings.forEach(booking => {
        const card = createBookingCard(booking);
        list.appendChild(card);
    });

    container.appendChild(list);
    return container;
}

function createBookingCard(booking) {
    const card = document.createElement('div');
    card.style.cssText = `
    background: var(--bg-tile);
    padding: 16px;
    border-radius: var(--radius-tile);
    border-left: 4px solid ${getStatusColor(booking.status)};
  `;

    const statusText = {
        'pending': 'Várakozik',
        'on_way': 'Úton vagyok',
        'arrived': 'Megérkeztem',
        'in_progress': 'Folyamatban',
        'completed': 'Kész'
    };

    card.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
      <div>
        <strong style="font-size: 1.2rem;">${booking.time}</strong>
        <span style="margin-left: 12px; color: var(--color-text-muted);">${booking.car.plate}</span>
      </div>
      <div style="color: ${getStatusColor(booking.status)}; font-weight: 600;">
        ${statusText[booking.status]}
      </div>
    </div>
    <div style="margin-bottom: 12px;">
      <strong>${booking.service.name}</strong> - ${booking.service.duration} perc
    </div>
  `;

    // Státusz gombok
    const actions = document.createElement('div');
    actions.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

    if (booking.status === 'pending') {
        actions.appendChild(createActionButton('🚗 Elindultam', () => {
            updateBookingStatus(booking.id, 'on_way');
            window.location.reload(); // Egyszerű frissítés
        }));
    }

    if (booking.status === 'on_way') {
        actions.appendChild(createActionButton('📍 Itt vagyok', () => {
            updateBookingStatus(booking.id, 'arrived');
            window.location.reload();
        }));
    }

    if (booking.status === 'arrived') {
        actions.appendChild(createActionButton('🔧 Kezdem', () => {
            updateBookingStatus(booking.id, 'in_progress');
            window.location.reload();
        }));
    }

    if (booking.status === 'in_progress') {
        actions.appendChild(createActionButton('✅ Befejeztem', () => {
            updateBookingStatus(booking.id, 'completed');
            window.location.reload();
        }));
    }

    card.appendChild(actions);
    return card;
}

function createActionButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
    background: var(--color-accent);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: transform 0.1s;
  `;
    btn.onclick = onClick;
    return btn;
}

function getStatusColor(status) {
    const colors = {
        'pending': '#a0a0a0',
        'on_way': '#60cdff',
        'arrived': '#ffa500',
        'in_progress': '#ffeb3b',
        'completed': '#4caf50'
    };
    return colors[status] || '#a0a0a0';
}
