import { state, saveStore } from '../core/store.js';
import { services } from '../data/services.js';
import { createTile } from '../components/Tile.js';
import { navigate } from '../core/router.js';

let bookingState = {
  selectedCar: null,
  selectedService: null,
  selectedDate: null,
  selectedTime: null,
  step: 1 // 1: szolgáltatás, 2: időpont, 3: összesítő
};

export function renderBooking() {
  const container = document.createElement('div');

  // Ellenőrzés: van-e kiválasztott autó?
  if (!state.cars || state.cars.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h2>Nincs autód a garázsban</h2>
        <p style="color: var(--color-text-muted); margin: 16px 0;">Először adj hozzá egy autót!</p>
        <button onclick="window.location.hash='/'" style="
          background: var(--color-accent);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
        ">Vissza a garázsba</button>
      </div>
    `;
    return container;
  }

  // Alapértelmezett: első autó kiválasztása
  if (!bookingState.selectedCar) {
    bookingState.selectedCar = state.cars[0];
  }

  // Header
  const header = document.createElement('div');
  header.style.marginBottom = '24px';
  header.innerHTML = `
    <button id="back-btn" style="
      background: none;
      border: none;
      color: var(--color-accent);
      cursor: pointer;
      font-size: 1.5rem;
      padding: 0;
      margin-bottom: 8px;
    ">← Vissza</button>
    <h1 style="font-size: 2rem; font-weight: 700;">Foglalás</h1>
    <p style="color: var(--color-text-muted);">${bookingState.selectedCar.plate} - ${bookingState.selectedCar.type || 'Autó'}</p>
  `;
  container.appendChild(header);

  // Lépés indikátor
  const stepIndicator = document.createElement('div');
  stepIndicator.style.cssText = 'display: flex; gap: 8px; margin-bottom: 24px;';
  for (let i = 1; i <= 3; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      flex: 1;
      height: 4px;
      background: ${i <= bookingState.step ? 'var(--color-accent)' : 'var(--bg-tile)'};
      border-radius: 2px;
      transition: background 0.3s;
    `;
    stepIndicator.appendChild(dot);
  }
  container.appendChild(stepIndicator);

  // Eseménykezelő a Vissza gombhoz
  container.querySelector('#back-btn').onclick = () => {
    if (bookingState.step > 1) {
      bookingState.step--;
      // Router újrahívása (mivel a hash nem változik, manuálisan elsütjük az eventet)
      window.dispatchEvent(new Event('hashchange'));
    } else {
      navigate('/');
    }
  };

  // Lépések renderelése
  if (bookingState.step === 1) {
    container.appendChild(renderServiceSelection());
  } else if (bookingState.step === 2) {
    container.appendChild(renderTimeSelection());
  } else if (bookingState.step === 3) {
    container.appendChild(renderSummary());
  }

  return container;
}

function renderServiceSelection() {
  const section = document.createElement('div');

  const title = document.createElement('h2');
  title.textContent = 'Válassz szolgáltatást';
  title.style.marginBottom = '16px';
  section.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'tile-grid';

  services.forEach(service => {
    const tile = createTile({
      title: service.name,
      subtitle: `${service.price} Ft • ${service.duration} perc`,
      icon: service.icon,
      size: 'full',
      onClick: () => {
        bookingState.selectedService = service;
        bookingState.step = 2;
        bookingState.step = 2;
        window.dispatchEvent(new Event('hashchange')); // Frissítés navigate helyett
      }
    });

    // Kiemelés ha kiválasztva
    if (bookingState.selectedService?.id === service.id) {
      tile.style.border = '2px solid var(--color-accent)';
    }

    grid.appendChild(tile);
  });

  section.appendChild(grid);
  return section;
}

function renderTimeSelection() {
  const section = document.createElement('div');

  const title = document.createElement('h2');
  title.textContent = 'Válassz időpontot';
  title.style.marginBottom = '16px';
  section.appendChild(title);

  // 4 hetes naptár importálása
  import('../utils/calendar.js').then(({ generateCalendarDates, generateTimeSlots }) => {
    const dates = generateCalendarDates();

    // Dátum választó (scrollable)
    const dateContainer = document.createElement('div');
    dateContainer.style.cssText = 'overflow-x: auto; margin-bottom: 24px; -webkit-overflow-scrolling: touch;';

    const dateGrid = document.createElement('div');
    dateGrid.style.cssText = 'display: flex; gap: 8px; padding-bottom: 8px;';

    dates.forEach(date => {
      const tile = document.createElement('div');
      const isClosed = date.isClosed;

      tile.style.cssText = `
        min-width: 80px;
        padding: 12px;
        background: ${isClosed ? 'rgba(255,255,255,0.02)' : 'var(--bg-tile)'};
        border-radius: var(--radius-tile);
        text-align: center;
        cursor: ${isClosed ? 'not-allowed' : 'pointer'};
        transition: all 0.2s;
        border: 2px solid ${bookingState.selectedDate === date.value ? 'var(--color-accent)' : 'transparent'};
        opacity: ${isClosed ? '0.5' : '1'};
      `;

      let labelHtml = `<div style="font-weight: 600;">${date.label}</div>`;
      if (isClosed) {
        labelHtml += `<div style="font-size: 0.75rem; color: var(--color-danger); margin-top: 4px;">ZÁRVA</div>`;
      }

      tile.innerHTML = labelHtml;

      if (!isClosed) {
        tile.onclick = () => {
          bookingState.selectedDate = date.value;
          document.querySelectorAll('[data-date-tile]').forEach(t => {
            // Reset border, but keep styling based on closed state logic implicitly handled by redraw or simple class toggle. 
            // Egyszerűbb ha mindent alapra állítunk és a jelenlegit kiemeljük.
            t.style.borderColor = 'transparent';
          });
          tile.style.borderColor = 'var(--color-accent)';
        };
      }

      tile.setAttribute('data-date-tile', '');
      dateGrid.appendChild(tile);
    });

    dateContainer.appendChild(dateGrid);
    section.appendChild(dateContainer);

    // Időpontok
    const timeTitle = document.createElement('h3');
    timeTitle.textContent = 'Időpont';
    timeTitle.style.margin = '16px 0';
    section.appendChild(timeTitle);

    const timeGrid = document.createElement('div');
    timeGrid.className = 'tile-grid';

    const times = generateTimeSlots();
    times.forEach(time => {
      const tile = createTile({
        title: time,
        size: 'medium',
        onClick: () => {
          if (!bookingState.selectedDate) {
            alert('Először válassz dátumot!');
            return;
          }
          bookingState.selectedTime = time;
          bookingState.step = 3;
          bookingState.step = 3;
          window.dispatchEvent(new Event('hashchange'));
        }
      });
      timeGrid.appendChild(tile);
    });
    section.appendChild(timeGrid);
  });

  return section;
}

function renderSummary() {
  const section = document.createElement('div');

  section.innerHTML = `
    <h2 style="margin-bottom: 24px;">Foglalás összesítő</h2>
    <div style="
      background: var(--bg-tile);
      padding: 20px;
      border-radius: var(--radius-tile);
      margin-bottom: 24px;
    ">
      <div style="margin-bottom: 12px;">
        <strong>Autó:</strong> ${bookingState.selectedCar.plate}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Szolgáltatás:</strong> ${bookingState.selectedService.name}
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Időpont:</strong> ${bookingState.selectedDate} ${bookingState.selectedTime}
      </div>
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--bg-tile-hover);">
        <strong style="font-size: 1.2rem; color: var(--color-accent);">
          ${bookingState.selectedService.price} Ft
        </strong>
      </div>
    </div>
  `;

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Foglalás véglegesítése';
  confirmBtn.style.cssText = `
    width: 100%;
    background: var(--color-accent);
    color: white;
    border: none;
    padding: 16px;
    border-radius: var(--radius-tile);
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.1s;
  `;
  confirmBtn.onclick = () => {
    // Foglalás mentése
    if (!state.bookings) state.bookings = [];
    state.bookings.push({
      id: Date.now(),
      car: bookingState.selectedCar,
      service: bookingState.selectedService,
      date: bookingState.selectedDate,
      time: bookingState.selectedTime,
      status: 'pending', // pending, on_way, arrived, in_progress, completed
      createdAt: new Date()
    });
    saveStore();

    // Reset
    bookingState = { step: 1, selectedCar: state.cars[0], selectedService: null, selectedDate: null, selectedTime: null };

    alert('✅ Foglalás sikeres!');
    navigate('/');
  };

  section.appendChild(confirmBtn);
  return section;
}
