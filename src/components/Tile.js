/**
 * Készít egy Csempe (Tile) elemet.
 * @param {Object} props - { title, subtitle, icon, size, onClick, variant }
 * @returns {HTMLElement}
 */
export function createTile({ title, subtitle, icon, size = 'medium', onClick, variant = 'glass' }) {
    const el = document.createElement('div');

    // Osztályok
    el.className = `tile tile-${size} tile-${variant}`;

    // HTML tartalom
    el.innerHTML = `
    <div class="tile-icon">${icon || ''}</div>
    <div class="tile-content">
      <h3 class="tile-title">${title}</h3>
      ${subtitle ? `<p class="tile-subtitle">${subtitle}</p>` : ''}
    </div>
  `;

    // Stílus hozzáadása a style.css-ben definiáltakon felül (ha kell)
    el.style.backgroundColor = 'var(--bg-tile)';
    el.style.borderRadius = 'var(--radius-tile)';
    el.style.padding = '16px';
    el.style.cursor = 'pointer';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.justifyContent = 'space-between';
    el.style.backdropFilter = 'var(--backdrop-blur)';
    el.style.transition = 'transform 0.1s, background-color 0.2s';
    el.style.minHeight = size === 'large' ? '180px' : '140px';

    if (size === 'full') {
        el.classList.add('tile-full'); // style.css-ben definiálva span 2
        el.style.gridColumn = 'span 2';
    }

    // Interakció
    el.onclick = () => {
        // "Benyomódás" effekt
        el.style.transform = 'scale(0.98)';
        setTimeout(() => el.style.transform = 'scale(1)', 100);
        if (onClick) onClick();
    };

    return el;
}
