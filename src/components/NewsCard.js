export function createNewsCard(newsItem) {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.style.cssText = `
        background: var(--bg-tile);
        border-radius: var(--radius-tile);
        padding: 16px;
        margin-bottom: 12px;
        backdrop-filter: var(--backdrop-blur);
        border: 1px solid rgba(255, 255, 255, 0.05);
        transition: transform 0.2s;
    `;

    // Dátum formázása
    const date = new Date(newsItem.createdAt).toLocaleDateString('hu-HU', {
        month: 'short',
        day: 'numeric'
    });

    card.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
            <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--color-text-main); margin: 0;">${newsItem.title}</h3>
            <span style="font-size: 0.8rem; color: var(--color-text-muted); background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">${date}</span>
        </div>
        <p style="
            font-size: 0.95rem; 
            color: var(--color-text-muted); 
            line-height: 1.5; 
            margin: 0;
            white-space: pre-wrap;
        ">${newsItem.content}</p>
    `;

    return card;
}
