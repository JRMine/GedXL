/**
 * sources-ui.js — Quelleneinstellungen UI (Schritt 3)
 */

// ---- DOM Refs ----
let sourcesContainer;

function initSourcesDomRefs() {
  sourcesContainer = document.getElementById('sources-container');
  document.getElementById('btn-add-source').addEventListener('click', () => {
    const s = createSourceDef();
    s.name = `Quelle ${sourceDefs.length + 1}`;
    sourceDefs.push(s);
    renderAllSources();
  });
}

// ---- Init ----
function initSources() {
  initSourcesDomRefs();
  if (sourceDefs.length === 0) {
    const s = createSourceDef();
    sourceDefs.push(s);
  }
  renderAllSources();
}

// ---- Render all sources ----
function renderAllSources() {
  sourcesContainer.innerHTML = '';
  sourceDefs.forEach((src, idx) => {
    sourcesContainer.appendChild(renderSourceDef(src, idx));
  });
}

function renderSourceDef(src, idx) {
  const card = document.createElement('div');
  card.className = 'source-card';
  card.id = 'source-card-' + src.id;

  // Header
  const header = document.createElement('div');
  header.className = 'source-card-header';
  header.innerHTML = `
    <span class="source-card-num">${idx + 1}</span>
    <input class="source-name-input" value="${escHtml(src.name)}" placeholder="Quellenbezeichnung (intern)" />
    ${sourceDefs.length > 1 ? `<button class="btn-icon btn-remove-source" title="Quelle entfernen">✕</button>` : ''}
  `;
  header.querySelector('.source-name-input').addEventListener('input', e => { src.name = e.target.value; });
  header.querySelector('.btn-remove-source')?.addEventListener('click', () => {
    sourceDefs = sourceDefs.filter(s => s.id !== src.id);
    renderAllSources();
  });
  card.appendChild(header);

  // Source fields
  const sfSection = document.createElement('div');
  sfSection.className = 'source-section';
  sfSection.innerHTML = `
    <div class="source-section-title">
      📖 Quell-Objekt
      <span class="source-section-hint">Beschreibt die Quelle selbst (wird einmalig in der GEDCOM angelegt)</span>
    </div>
  `;
  src.sourceFields.forEach(field => {
    sfSection.appendChild(renderSourceFieldRow(field, src));
  });
  card.appendChild(sfSection);

  // Citation fields
  const cfSection = document.createElement('div');
  cfSection.className = 'source-section';
  cfSection.innerHTML = `
    <div class="source-section-title">
      🔖 Zitation
      <span class="source-section-hint">Individuelle Angaben je Datensatz (z.B. Seitenzahl)</span>
    </div>
  `;
  src.citationFields.forEach(field => {
    cfSection.appendChild(renderSourceFieldRow(field, src));
  });
  card.appendChild(cfSection);

  // Attach-to settings
  const attachSection = document.createElement('div');
  attachSection.className = 'source-section source-attach-section';
  attachSection.innerHTML = `
    <div class="source-section-title">📎 Quelle anhängen an</div>
    <div class="source-attach-options">
      <label class="attach-option">
        <input type="checkbox" class="attach-chk" data-key="person" ${src.attachTo.person ? 'checked' : ''} />
        Person
      </label>
      <label class="attach-option">
        <input type="checkbox" class="attach-chk" data-key="events" ${src.attachTo.events ? 'checked' : ''} />
        Alle Ereignisse
      </label>
      <label class="attach-option attach-manual">
        <input type="checkbox" disabled />
        Nur manuell im Mapping
        <span class="attach-hint">(Quellenfeld im Mapping-Schritt per Drag & Drop setzen)</span>
      </label>
    </div>
    <p class="source-attach-note">
      ${!src.attachTo.person && !src.attachTo.events
        ? '⚠️ Quelle wird nicht automatisch angehängt — bitte im Mapping-Schritt manuell zuweisen.'
        : ''}
    </p>
  `;
  attachSection.querySelectorAll('.attach-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      src.attachTo[chk.dataset.key] = chk.checked;
      // Re-render just the note
      const note = attachSection.querySelector('.source-attach-note');
      note.textContent = !src.attachTo.person && !src.attachTo.events
        ? '⚠️ Quelle wird nicht automatisch angehängt — bitte im Mapping-Schritt manuell zuweisen.'
        : '';
    });
  });
  card.appendChild(attachSection);

  // Preview
  const previewSection = document.createElement('div');
  previewSection.className = 'source-section source-preview-section';
  previewSection.innerHTML = `<div class="source-section-title">👁 Vorschau (erste Datenzeile)</div>`;
  previewSection.appendChild(renderSourcePreview(src));
  card.appendChild(previewSection);

  return card;
}

// ---- Source field row ----
function renderSourceFieldRow(field, src) {
  const row = document.createElement('div');
  row.className = 'source-field-row-ui';

  // Label
  const labelEl = document.createElement('div');
  labelEl.className = 'source-field-label';
  labelEl.innerHTML = `${escHtml(field.label)} <span class="source-field-tag">${escHtml(field.tag)}</span>`;
  row.appendChild(labelEl);

  // Type toggle
  const typeWrap = document.createElement('div');
  typeWrap.className = 'source-type-toggle';

  const btnStatic = document.createElement('button');
  btnStatic.className = 'toggle-btn' + (field.valueType === 'static' ? ' active' : '');
  btnStatic.textContent = '✏️ Fester Wert';
  btnStatic.addEventListener('click', () => {
    field.valueType = 'static';
    renderAllSources();
  });

  const btnCol = document.createElement('button');
  btnCol.className = 'toggle-btn' + (field.valueType === 'col' ? ' active' : '');
  btnCol.textContent = '📋 Aus Spalte';
  btnCol.addEventListener('click', () => {
    field.valueType = 'col';
    renderAllSources();
  });

  typeWrap.appendChild(btnStatic);
  typeWrap.appendChild(btnCol);
  row.appendChild(typeWrap);

  // Value input
  const valueWrap = document.createElement('div');
  valueWrap.className = 'source-value-wrap';

  if (field.valueType === 'static') {
    const input = document.createElement('input');
    input.className = 'source-val-input';
    input.value = field.value || '';
    input.placeholder = 'Wert eingeben…';
    input.addEventListener('input', e => { field.value = e.target.value; updateSourcePreview(src); });
    valueWrap.appendChild(input);
  } else {
    const sel = document.createElement('select');
    sel.className = 'source-val-input source-col-sel';
    sel.innerHTML = `<option value="">-- Spalte wählen --</option>` +
      headers.map((h, i) => ignoredColumns.has(i) ? '' :
        `<option value="${i}" ${field.colIdx === i ? 'selected' : ''}>${escHtml(h)}</option>`
      ).join('');
    sel.addEventListener('change', e => {
      field.colIdx = e.target.value === '' ? null : parseInt(e.target.value);
      updateSourcePreview(src);
    });
    valueWrap.appendChild(sel);
    // Example value
    if (field.colIdx !== null) {
      const example = getColExample(field.colIdx);
      if (example) {
        const ex = document.createElement('span');
        ex.className = 'source-col-example';
        ex.textContent = `→ z.B. „${example}"`;
        valueWrap.appendChild(ex);
      }
    }
  }

  row.appendChild(valueWrap);
  return row;
}

// ---- Source preview ----
function renderSourcePreview(src) {
  const dataRow = getFirstDataRow();
  const wrap = document.createElement('div');
  wrap.className = 'source-preview-wrap';
  wrap.id = 'src-preview-' + src.id;

  const allFields = [...src.sourceFields, ...src.citationFields];
  const hasAny = allFields.some(f => previewSourceField(f, dataRow));

  if (!hasAny) {
    wrap.innerHTML = '<p class="empty-hint">Noch keine Felder ausgefüllt.</p>';
    return wrap;
  }

  // Source record
  const sourceBlock = document.createElement('div');
  sourceBlock.className = 'src-preview-block';
  sourceBlock.innerHTML = '<div class="src-preview-block-title">0 SOUR @S1@</div>';
  src.sourceFields.forEach(f => {
    const v = previewSourceField(f, dataRow);
    if (!v) return;
    const r = document.createElement('div');
    r.className = 'src-preview-line';
    r.innerHTML = `<span class="src-tag">1 ${escHtml(f.tag)}</span> <span class="src-val">${escHtml(v)}</span>`;
    sourceBlock.appendChild(r);
  });
  wrap.appendChild(sourceBlock);

  // Citation record
  const citBlock = document.createElement('div');
  citBlock.className = 'src-preview-block src-preview-citation';
  citBlock.innerHTML = '<div class="src-preview-block-title">2 SOUR @S1@ <span class="src-preview-subtitle">(Zitation je Person/Ereignis)</span></div>';
  src.citationFields.forEach(f => {
    const v = previewSourceField(f, dataRow);
    if (!v) return;
    const r = document.createElement('div');
    r.className = 'src-preview-line';
    r.innerHTML = `<span class="src-tag">3 ${escHtml(f.tag)}</span> <span class="src-val">${escHtml(v)}</span>`;
    citBlock.appendChild(r);
  });
  wrap.appendChild(citBlock);

  return wrap;
}

function updateSourcePreview(src) {
  const existing = document.getElementById('src-preview-' + src.id);
  if (existing) existing.replaceWith(renderSourcePreview(src));
}
