/**
 * ui-utils.js - Gemeinsame UI-Hilfsfunktionen
 */

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Generic "add" dropdown button (portal) ----
let activeDropdown = null;

function closeActiveDropdown() {
  if (activeDropdown) { activeDropdown.remove(); activeDropdown = null; }
}

document.addEventListener('click', closeActiveDropdown);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeActiveDropdown(); });

function createAddButton(text, options, onSelect, small = false) {
  const btn = document.createElement('button');
  btn.className = (small ? 'btn-secondary btn-small' : 'btn-secondary') + ' add-btn';
  btn.textContent = text;
  btn.style.marginTop = '6px';
  btn.addEventListener('click', e => {
    e.stopPropagation();
    closeActiveDropdown();
    const dropdown = document.createElement('div');
    dropdown.className = 'add-dropdown-portal';
    options.forEach(opt => {
      const item = document.createElement('div');
      item.className = 'add-dropdown-item';
      item.textContent = opt.label;
      item.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        closeActiveDropdown();
        onSelect(opt.path);
      });
      dropdown.appendChild(item);
    });
    document.body.appendChild(dropdown);
    activeDropdown = dropdown;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropH = Math.min(options.length * 38, 280);
    dropdown.style.position = 'fixed';
    dropdown.style.left = rect.left + 'px';
    dropdown.style.minWidth = Math.max(rect.width, 240) + 'px';
    if (spaceBelow >= dropH || spaceBelow >= 120) {
      dropdown.style.top = (rect.bottom + 4) + 'px';
    } else {
      dropdown.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    }
  });
  const wrap = document.createElement('div');
  wrap.className = 'add-btn-wrap';
  wrap.appendChild(btn);
  return wrap;
}
