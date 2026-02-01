import { state } from '../core/store.js';
import { createNewsCard } from '../components/NewsCard.js';
import { navigate } from '../core/router.js';

export function renderGarage() {
    const container = document.createElement('div');
    container.className = 'garage-view';
    container.style.cssText = 'padding-bottom: 80px;'; // Hely a fix gomboknak vagy csak esztétika

    // 1. HERO SECTION (Legközelebbi foglalás)
    const nextBooking = getNextBooking();
    const heroSection = document.createElement('div');
    heroSection.className = 'hero-section';
    heroSection.style.marginBottom = '24px';

    if (nextBooking) {
        // Aktív foglalás nézet
        heroSection.innerHTML = `
            <div style="font-size: 0.9rem; margin-bottom: 4px; opacity: 0.9;">Következő időpont</div>
            <div style="font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 8px;" id="hero-countdown">
                Számolás...
            </div>
            <div style="font-size: 1.1rem; font-weight: 500;">
                ${nextBooking.date} ${nextBooking.time}
            </div>
            <div style="
                margin-top: 12px; 
                display: inline-block; 
                padding: 4px 12px; 
                background: rgba(255,255,255,0.2); 
                border-radius: 20px; 
                font-size: 0.9rem;
            ">
                ${nextBooking.service.name}
            </div>
        `;
        heroSection.style.background = 'linear-gradient(135deg, var(--color-accent), #0078d7)';
        heroSection.style.padding = '24px';
        heroSection.style.borderRadius = '16px';
        heroSection.style.boxShadow = '0 10px 30px -10px var(--color-accent)';
        heroSection.style.color = 'white';

        // Countdown logika indítása
        startCountdown(nextBooking);
    } else {
        // Nincs foglalás - Üdvözlő nézet
        heroSection.innerHTML = `
            <h1 style="font-size: 2rem; margin-bottom: 8px;">Szia Feco! 👋</h1>
            <p style="opacity: 0.8; margin-bottom: 20px;">Nincs aktív foglalásod mostanában.</p>
            <button id="hero-book-btn" style="
                background: white; 
                color: var(--color-accent); 
                border: none; 
                padding: 12px 24px; 
                border-radius: 30px; 
                font-weight: 700; 
                font-size: 1rem;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                cursor: pointer;
            ">Új időpont 📅</button>
        `;
        heroSection.style.background = 'linear-gradient(135deg, #60cdff, #2a5298)';
        heroSection.style.padding = '32px 24px';
        heroSection.style.borderRadius = '16px';
        heroSection.style.color = 'white';
        heroSection.style.textAlign = 'center';
    }
    container.appendChild(heroSection);

    // Eseménykezelő a gombra (ha létezik)
    setTimeout(() => {
        const btn = heroSection.querySelector('#hero-book-btn');
        if (btn) btn.onclick = () => navigate('/booking');
    }, 0);


    // 2. QUICK ACTIONS (Gyorsgombok)
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
        display: flex;
        gap: 12px;
        margin-bottom: 32px;
        overflow-x: auto;
        padding-bottom: 8px; /* Scrollbar hely */
    `;

    const actions = [
        { label: 'Foglalás', icon: '📅', path: '/booking', color: 'rgba(96, 205, 255, 0.15)' },
        { label: 'Profil', icon: '👤', path: '/profile', color: 'rgba(255, 255, 255, 0.05)' },
        { label: 'Admin', icon: '⚙️', path: '/admin', color: 'rgba(255, 255, 255, 0.05)' },
    ];

    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.innerHTML = `<span style="font-size: 1.2rem; margin-right: 8px;">${act.icon}</span> ${act.label}`;
        btn.style.cssText = `
            background: ${act.color};
            border: 1px solid rgba(255,255,255,0.1);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            display: flex;
            align-items: center;
        `;
        btn.onclick = act.path ? () => navigate(act.path) : act.onClick;
        actionsContainer.appendChild(btn);
    });
    container.appendChild(actionsContainer);


    // 3. NEWS FEED (Hírek)
    const newsHeader = document.createElement('h2');
    newsHeader.textContent = 'Hírek & Infók';
    newsHeader.style.cssText = 'font-size: 1.2rem; margin-bottom: 16px; padding-left: 4px; border-left: 4px solid var(--color-accent); padding-bottom: 0; line-height: 1;';
    container.appendChild(newsHeader);

    const newsContainer = document.createElement('div');
    newsContainer.className = 'news-feed';

    if (!state.news || state.news.length === 0) {
        newsContainer.innerHTML = `
            <div style="
                text-align: center; 
                padding: 30px; 
                color: var(--color-text-muted); 
                background: rgba(255,255,255,0.02); 
                border-radius: 12px; 
                border: 1px dashed rgba(255,255,255,0.1);"
            >
                Nincsenek friss hírek.
            </div>
        `;
    } else {
        state.news.forEach(item => {
            newsContainer.appendChild(createNewsCard(item));
        });
    }
    container.appendChild(newsContainer);

    return container;
}

// Segédfüggvények
function getNextBooking() {
    if (!state.bookings || state.bookings.length === 0) return null;
    const now = new Date();
    const upcoming = state.bookings
        .filter(b => b.status !== 'completed')
        .map(b => ({ ...b, datetime: new Date(`${b.date}T${b.time}:00`) }))
        .filter(b => b.datetime > now)
        .sort((a, b) => a.datetime - b.datetime);
    return upcoming[0] || null;
}

function startCountdown(booking) {
    import('../utils/calendar.js').then(({ calculateCountdown }) => {
        const update = () => {
            const el = document.getElementById('hero-countdown');
            if (!el) return;
            const res = calculateCountdown(booking.date, booking.time);
            el.textContent = res.expired ? 'Most!' : res.text;
        };
        update();
        setInterval(update, 1000);
    });
}
