import { state, addCar, deleteCar } from '../core/store.js';
import { navigate } from '../core/router.js';

export function renderProfile() {
    const container = document.createElement('div');
    container.style.cssText = 'padding-bottom: 40px;';

    // Header
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
    <h1 style="font-size: 2rem; font-weight: 700;">Profil</h1>
  `;
    container.appendChild(header);

    // 1. User Info Card
    const userCard = document.createElement('div');
    userCard.style.cssText = `
        background: var(--bg-tile);
        padding: 24px;
        border-radius: var(--radius-tile);
        margin-bottom: 24px;
        display: flex;
        align-items: center;
        gap: 16px;
    `;
    userCard.innerHTML = `
        <div style="
            width: 60px; height: 60px; 
            background: var(--color-accent); 
            border-radius: 50%; 
            display: flex; align-items: center; justify-content: center;
            font-size: 1.5rem; color: white;
        ">F</div>
        <div>
            <h2 style="margin: 0; font-size: 1.5rem;">Feco</h2>
            <div style="color: var(--color-text-muted);">Felhasználó</div>
        </div>
    `;
    container.appendChild(userCard);

    // 2. Car Management
    const carsHeader = document.createElement('div');
    carsHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
    carsHeader.innerHTML = `
        <h2 style="margin:0;">Autóim</h2>
        <button id="add-car-btn" style="
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.9rem;
        ">+ Hozzáadás</button>
    `;
    container.appendChild(carsHeader);

    // Add Car Handler
    setTimeout(() => {
        const btn = container.querySelector('#add-car-btn');
        if (btn) btn.onclick = () => {
            const plate = prompt('Rendszám (pl. ABC-123):');
            if (plate) {
                addCar({ plate, type: 'Ismeretlen', addedAt: new Date() });
                navigate('/profile'); // Re-render
            }
        };
    }, 0);


    // Car List
    const carList = document.createElement('div');
    carList.style.cssText = 'display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;';

    if (!state.cars || state.cars.length === 0) {
        carList.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: 20px;">Nincs felvett autód.</div>';
    } else {
        state.cars.forEach(car => {
            const row = document.createElement('div');
            row.style.cssText = `
                background: rgba(255, 255, 255, 0.05);
                padding: 16px;
                border-radius: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            row.innerHTML = `
                <div>
                    <div style="font-weight: 700; font-size: 1.1rem;">${car.plate}</div>
                    <div style="font-size: 0.85rem; color: var(--color-text-muted);">${car.type || 'Személyautó'}</div>
                </div>
            `;

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.style.cssText = `
                background: rgba(255, 77, 79, 0.2);
                border: 1px solid rgba(255, 77, 79, 0.3);
                color: #ff4d4f;
                width: 36px; height: 36px;
                border-radius: 50%;
                cursor: pointer;
                display: flex; align-items: center; justify-content: center;
            `;
            deleteBtn.onclick = () => {
                if (confirm(`Biztosan törlöd a(z) ${car.plate} autót?`)) {
                    deleteCar(car.plate);
                    navigate('/profile');
                }
            };

            row.appendChild(deleteBtn);
            carList.appendChild(row);
        });
    }
    container.appendChild(carList);

    // 3. Settings (Placeholder)
    const settingsHeader = document.createElement('h2');
    settingsHeader.textContent = 'Beállítások';
    settingsHeader.style.marginBottom = '16px';
    container.appendChild(settingsHeader);

    const settingsList = document.createElement('div');
    settingsList.style.cssText = `
        background: var(--bg-tile);
        border-radius: var(--radius-tile);
        overflow: hidden;
    `;

    const createSettingRow = (label, icon) => `
        <div style="
            padding: 16px; 
            border-bottom: 1px solid rgba(255,255,255,0.05); 
            display: flex; justify-content: space-between; align-items: center;
            opacity: 0.6;
        ">
            <span style="display: flex; align-items: center; gap: 12px;">
                <span>${icon}</span> ${label}
            </span>
            <span>></span>
        </div>
    `;

    settingsList.innerHTML = `
        ${createSettingRow('Értesítések', '🔔')}
        ${createSettingRow('Adatvédelem', '🔒')}
        ${createSettingRow('Névjegy', 'ℹ️')}
    `;
    container.appendChild(settingsList);

    const version = document.createElement('div');
    version.style.cssText = 'text-align: center; margin-top: 24px; color: var(--color-text-muted); font-size: 0.8rem;';
    version.textContent = 'Verzió: 1.0.2 (Beta)';
    container.appendChild(version);

    return container;
}
