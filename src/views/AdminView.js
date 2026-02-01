export function renderAdmin() {
  const container = document.createElement('div');

  // State for Tabs
  let activeTab = 'bookings'; // 'bookings', 'news', 'legal'

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
    <h1 style="font-size: 2rem; font-weight: 700;">Admin Panel</h1>
  `;
  container.appendChild(header);

  // Tab Navigation
  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = `
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 12px;
    `;

  const createTabBtn = (id, label) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    const isActive = activeTab === id;
    btn.style.cssText = `
            background: ${isActive ? 'var(--color-accent)' : 'transparent'};
            color: ${isActive ? 'white' : 'var(--color-text-muted)'};
            border: 1px solid ${isActive ? 'transparent' : 'var(--color-border)'};
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        `;
    btn.onclick = () => {
      activeTab = id;
      renderContent();
    };
    return btn;
  };

  const renderTabs = () => {
    tabsContainer.innerHTML = '';
    tabsContainer.appendChild(createTabBtn('bookings', 'Munkák'));
    tabsContainer.appendChild(createTabBtn('news', 'Hírek 📢'));
    tabsContainer.appendChild(createTabBtn('legal', 'Jogi Kisokos ⚖️'));
  };

  container.appendChild(tabsContainer);

  // Content Container
  const contentContainer = document.createElement('div');
  container.appendChild(contentContainer);

  // Render Content Logic
  const renderContent = () => {
    renderTabs(); // Re-render tabs to update active state styling
    contentContainer.innerHTML = '';

    if (activeTab === 'bookings') {
      renderBookings(contentContainer);
    } else if (activeTab === 'news') {
      renderNewsManager(contentContainer);
    } else if (activeTab === 'legal') {
      renderLegalGuide(contentContainer);
    }
  };

  // Initial Render
  renderContent();

  return container;
}

function renderBookings(container) {
  // Mai foglalások szűrése
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = (state.bookings || []).filter(b =>
    b.date === today && b.status !== 'completed'
  ).sort((a, b) => a.time.localeCompare(b.time));

  if (todayBookings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-text-muted);">
        <h2>Nincs mai munka</h2>
        <p>Élvezd a szabadnapot! 🎉</p>
      </div>
    `;
    return;
  }

  // Munkalista
  const list = document.createElement('div');
  list.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';

  todayBookings.forEach(booking => {
    const card = createBookingCard(booking);
    list.appendChild(card);
  });

}

function renderNewsManager(container) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 24px;';

  // 1. Új hír űrlap
  const formCard = document.createElement('div');
  formCard.style.cssText = `
        background: var(--bg-tile);
        padding: 16px;
        border-radius: var(--radius-tile);
    `;

  formCard.innerHTML = `
        <h3 style="margin-top:0; margin-bottom:12px; color: var(--color-accent);">Új Hír Közzététele</h3>
        <input type="text" id="news-title" placeholder="Cím (pl. Nyári Szabadság)" style="
            width: 100%;
            padding: 10px;
            margin-bottom: 8px;
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--color-border);
            color: white;
            border-radius: 4px;
        ">
        <textarea id="news-content" placeholder="Üzenet szövege..." rows="3" style="
            width: 100%;
            padding: 10px;
            margin-bottom: 12px;
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--color-border);
            color: white;
            border-radius: 4px;
            resize: vertical;
        "></textarea>
        <button id="btn-post-news" style="
            background: var(--color-accent);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
        ">Közzététel</button>
    `;
  wrapper.appendChild(formCard);

  // Eseménykezelő a gombhoz
  const btn = formCard.querySelector('#btn-post-news');
  btn.onclick = () => {
    const title = formCard.querySelector('#news-title').value;
    const content = formCard.querySelector('#news-content').value;

    if (title && content) {
      addNews({ title, content });
      renderNewsManager(container); // Újrarajzolás
    } else {
      alert('Kérlek töltsd ki mindkét mezőt!');
    }
  };

  // 2. Létező hírek listája
  const listContainer = document.createElement('div');

  if (!state.news || state.news.length === 0) {
    listContainer.innerHTML = '<div style="text-align:center; color: var(--color-text-muted);">Nincsenek hírek.</div>';
  } else {
    state.news.forEach(item => {
      const itemRow = document.createElement('div');
      itemRow.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255,255,255,0.05);
                padding: 12px;
                margin-bottom: 8px;
                border-radius: var(--radius-tile);
            `;

      itemRow.innerHTML = `
                <div>
                    <div style="font-weight:600;">${item.title}</div>
                    <div style="font-size:0.8rem; color: var(--color-text-muted);">${new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
            `;

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Törlés 🗑️';
      delBtn.style.cssText = `
                background: rgba(255, 77, 79, 0.2);
                color: #ff4d4f;
                border: 1px solid rgba(255, 77, 79, 0.3);
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
            `;
      delBtn.onclick = () => {
        if (confirm('Biztosan törlöd?')) {
          deleteNews(item.id);
          renderNewsManager(container);
        }
      };

      itemRow.appendChild(delBtn);
      listContainer.appendChild(itemRow);
    });
  }

  wrapper.appendChild(listContainer);

  container.innerHTML = '';
  container.appendChild(wrapper);
}

function renderLegalGuide(container) {
  const guide = document.createElement('div');
  guide.style.cssText = `
        background: var(--bg-tile);
        padding: 24px;
        border-radius: var(--radius-tile);
        line-height: 1.6;
        color: var(--color-text);
    `;

  guide.innerHTML = `
        <h2 style="margin-top: 0; color: var(--color-accent);">Mellékállású Egyéni Vállalkozás (2025/26)</h2>
        <div style="margin-bottom: 24px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 4px solid var(--color-accent);">
            <strong>Alapfeltétel:</strong> Minimum heti 36 órás főállás mellett.
        </div>

        <h3 style="margin-bottom: 8px;">1. Adózás: Átalányadó</h3>
        <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px; color: var(--color-text-muted);">
            <li><strong>Költséghányad:</strong> 40% (2026-tól várhatóan 45%).</li>
            <li><strong>Adómentes keret:</strong> Éves minimálbér fele.
                <br><em>Ez kb. évi 3,5 millió Ft bevételig 0 Ft SZJA-t jelent!</em>
            </li>
        </ul>

        <h3 style="margin-bottom: 8px;">2. Fizetendő terhek (ha a keret alatt vagy)</h3>
        <ul style="padding-left: 20px; list-style-type: disc; margin-bottom: 16px; color: var(--color-text-muted);">
            <li><strong>Adók (SZJA, TB, SZOCHO):</strong> 0 Ft.</li>
            <li><strong>Iparűzési adó (IPA):</strong> Sávos rendszerben évi fix 50.000 Ft (12M bevétel alatt).</li>
            <li><strong>Kamarai díj:</strong> Évi 5.000 Ft.</li>
        </ul>

        <hr style="border: 0; border-top: 1px solid var(--color-border); margin: 24px 0;">

        <h2 style="color: var(--color-accent);">Jognyilatkozat</h2>
        <h3 style="margin-bottom: 8px;">"Minden jog fenntartva"</h3>
        <p style="color: var(--color-text-muted); margin-bottom: 16px;">
            Ez a figyelmeztetés jelzi, hogy a weboldalon található minden tartalom (képek, szövegek, logó) a te szellemi tulajdonod.
            Bár a védelem automatikus, érdemes kirakni, mert elrettentő erejű és profizmust sugall.
        </p>
        <div style="background: #000; padding: 12px; border-radius: 6px; font-family: monospace; text-align: center;">
            © 2026 HFZű Autókozmetika. Minden jog fenntartva.
        </div>
    `;

  container.appendChild(guide);
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
