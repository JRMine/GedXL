/**
 * sources-ui.js — Quelleneinstellungen UI (Schritt 3)
 */

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

function initSources() {
  initSourcesDomRefs();
  if (sourceDefs.length === 0) {
    sourceDefs.push(createSourceDef());
  }
  renderAllSources();
}

function renderAllSources() {
  sourcesContainer.innerHTML = '';
  sourceDefs.forEach((src, idx) => sourcesContainer.appendChild(renderSourceDef(src, idx)));
}

// ---- Render one source card ----
function renderSourceDef(src, idx) {
  const card = document.createElement('div');
  card.className = 'source-card';

  // ---- Header ----
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

  // ---- Mode tiles ----
  const modeSection = document.createElement('div');
  modeSection.className = 'source-section source-mode-section';
  modeSection.innerHTML = `<div class="source-section-title">⚙️ Verwendungsart</div>`;
  const modeGrid = document.createElement('div');
  modeGrid.className = 'source-mode-grid';
  SOURCE_MODES.forEach(m => {
    const tile = document.createElement('label');
    tile.className = 'source-mode-tile' + (src.mode === m.value ? ' active' : '');
    tile.innerHTML = `
      <input type="radio" name="src-mode-${src.id}" value="${m.value}" ${src.mode === m.value ? 'checked' : ''} hidden />
      <span class="mode-tile-label">${m.label}</span>
      <span class="mode-tile-desc">${m.desc}</span>
    `;
    tile.addEventListener('click', () => {
      src.mode = m.value;
      applyModeDefaults(src);
      renderAllSources();
    });
    modeGrid.appendChild(tile);
  });
  modeSection.appendChild(modeGrid);
  card.appendChild(modeSection);

  // ---- Existing ID field ----
  if (src.mode === 'existing') {
    const existSection = document.createElement('div');
    existSection.className = 'source-section';
    existSection.innerHTML = `
      <div class="source-section-title">🔗 GEDCOM Quell-ID</div>
      <div class="source-field-row-ui" style="grid-template-columns:200px 1fr">
        <div class="source-field-label">ID in Ziel-GEDCOM</div>
        <input class="source-val-input" value="${escHtml(src.existingId)}" placeholder="z.B. @S1@" />
      </div>
      <p class="source-hint" style="margin-top:8px">Die Quelle muss bereits in der Ziel-GEDCOM-Datei vorhanden sein. Nur die Zitation wird neu angelegt.</p>
    `;
    existSection.querySelector('input').addEventListener('input', e => { src.existingId = e.target.value; updateSourcePreview(src); });
    card.appendChild(existSection);
  }

  // ---- Source object fields (not for 'existing') ----
  if (src.mode !== 'existing') {
    const sfSection = document.createElement('div');
    sfSection.className = 'source-section';
    sfSection.innerHTML = `<div class="source-section-title">📖 Quell-Objekt <span class="source-section-hint">Beschreibt die Quelle selbst (einmalig in GEDCOM)</span></div>`;
    src.sourceFields.forEach(field => sfSection.appendChild(renderSourceFieldRow(field, src, 'source')));
    sfSection.appendChild(renderAddFieldButton(src, 'source'));
    card.appendChild(sfSection);
  }

  // ---- Citation fields (all modes) ----
  const cfSection = document.createElement('div');
  cfSection.className = 'source-section';
  cfSection.innerHTML = `<div class="source-section-title">🔖 Zitation <span class="source-section-hint">Individuelle Angaben je Datensatz (z.B. Seitenzahl)</span></div>`;
  src.citationFields.forEach(field => cfSection.appendChild(renderSourceFieldRow(field, src, 'citation')));
  cfSection.appendChild(renderAddFieldButton(src, 'citation'));
  card.appendChild(cfSection);

  // ---- Attach-to ----
  const attachSection = document.createElement('div');
  attachSection.className = 'source-section source-attach-section';
  attachSection.innerHTML = `<div class="source-section-title">📎 Quelle automatisch anhängen an</div>`;
  const opts = document.createElement('div');
  opts.className = 'source-attach-options';
  [
    { key: 'person', label: 'Person' },
    { key: 'events', label: 'Alle Ereignisse' },
  ].forEach(({ key, label }) => {
    const lbl = document.createElement('label');
    lbl.className = 'attach-option';
    lbl.innerHTML = `<input type="checkbox" ${src.attachTo[key] ? 'checked' : ''} /> ${label}`;
    lbl.querySelector('input').addEventListener('change', e => { src.attachTo[key] = e.target.checked; });
    opts.appendChild(lbl);
  });
  const manualNote = document.createElement('p');
  manualNote.className = 'source-attach-note source-hint';
  manualNote.textContent = 'Zusätzlich können im Mapping-Schritt ereignisspezifische Zitationen manuell hinzugefügt oder angepasst werden.';
  attachSection.appendChild(opts);
  attachSection.appendChild(manualNote);
  card.appendChild(attachSection);

  // ---- Preview ----
  const previewSection = document.createElement('div');
  previewSection.className = 'source-section source-preview-section';
  previewSection.innerHTML = `<div class="source-section-title">👁 Vorschau (erste Datenzeile)</div>`;
  previewSection.appendChild(renderSourcePreview(src));
  card.appendChild(previewSection);

  return card;
}

// ---- Render a single source field row ----
function renderSourceFieldRow(field, src, fieldSet) {
  const row = document.createElement('div');
  row.className = 'source-field-row-ui';

  // Label + tag
  const labelEl = document.createElement('div');
  labelEl.className = 'source-field-label';
  labelEl.innerHTML = `${escHtml(field.label)} <span class="source-field-tag">${escHtml(field.tag)}</span>`;
  row.appendChild(labelEl);

  // Toggle (only show in 'new' mode for sourceFields, always for citations)
  const canToggle = src.mode !== 'table';
  const typeWrap = document.createElement('div');
  typeWrap.className = 'source-type-toggle';
  if (canToggle) {
    const btnStatic = document.createElement('button');
    btnStatic.className = 'toggle-btn' + (field.valueType === 'static' ? ' active' : '');
    btnStatic.textContent = '✏️ Fester Wert';
    btnStatic.addEventListener('click', () => { field.valueType = 'static'; renderAllSources(); });
    const btnCol = document.createElement('button');
    btnCol.className = 'toggle-btn' + (field.valueType === 'col' ? ' active' : '');
    btnCol.textContent = '📋 Aus Spalte';
    btnCol.addEventListener('click', () => { field.valueType = 'col'; renderAllSources(); });
    typeWrap.appendChild(btnStatic);
    typeWrap.appendChild(btnCol);
  } else {
    typeWrap.innerHTML = '<span class="toggle-fixed">📋 Aus Spalte</span>';
  }
  row.appendChild(typeWrap);

  // Value input
  const valueWrap = document.createElement('div');
  valueWrap.className = 'source-value-wrap';
  if (field.valueType === 'static' && canToggle) {
    const input = document.createElement('input');
    input.className = 'source-val-input';
    input.value = field.value || '';
    input.placeholder = 'Wert eingeben…';
    input.addEventListener('input', e => { field.value = e.target.value; updateSourcePreview(src); });
    valueWrap.appendChild(input);
  } else {
    const sel = buildColSelect(field.colIdx, (val) => { field.colIdx = val; updateSourcePreview(src); });
    valueWrap.appendChild(sel);
    if (field.colIdx !== null) {
      const ex = getColExample(field.colIdx);
      if (ex) {
        const span = document.createElement('span');
        span.className = 'source-col-example';
        span.textContent = `→ z.B. „${ex}"`;
        valueWrap.appendChild(span);
      }
    }
  }
  row.appendChild(valueWrap);

  // Remove button (only for user-added fields)
  const rmBtn = document.createElement('button');
  rmBtn.className = 'btn-icon source-field-remove';
  rmBtn.title = 'Feld entfernen';
  rmBtn.textContent = '✕';
  rmBtn.addEventListener('click', () => {
    if (fieldSet === 'source') src.sourceFields = src.sourceFields.filter(f => f.id !== field.id);
    else src.citationFields = src.citationFields.filter(f => f.id !== field.id);
    renderAllSources();
  });
  row.appendChild(rmBtn);

  return row;
}

// ---- Add field button ----
function renderAddFieldButton(src, fieldSet) {
  const available = fieldSet === 'source' ? AVAILABLE_SOURCE_FIELDS : AVAILABLE_CITATION_FIELDS;
  return createAddButton(
    `+ Feld hinzufügen`,
    available.map(f => ({ path: f.tag, label: `${f.label} (${f.tag})` })),
    (tag) => {
      const def = available.find(f => f.tag === tag);
      const newField = createSourceFieldDef(tag, def?.label || tag, src.mode === 'table' ? 'col' : 'static');
      if (fieldSet === 'source') src.sourceFields.push(newField);
      else src.citationFields.push(newField);
      renderAllSources();
    },
    true
  );
}

// ---- Column select helper ----
function buildColSelect(selectedColIdx, onChange) {
  const sel = document.createElement('select');
  sel.className = 'source-val-input source-col-sel';
  sel.innerHTML = `<option value="">-- Spalte wählen --</option>` +
    headers.map((h, i) => ignoredColumns.has(i) ? '' :
      `<option value="${i}" ${selectedColIdx === i ? 'selected' : ''}>${escHtml(h)}</option>`
    ).join('');
  sel.addEventListener('change', e => onChange(e.target.value === '' ? null : parseInt(e.target.value)));
  return sel;
}

// ---- Preview ----
function renderSourcePreview(src) {
  const dataRow = getFirstDataRow();
  const wrap = document.createElement('div');
  wrap.className = 'source-preview-wrap';
  wrap.id = 'src-preview-' + src.id;

  if (src.mode === 'existing') {
    if (src.existingId) {
      wrap.innerHTML = `<div class="src-preview-block"><div class="src-preview-block-title">2 SOUR ${escHtml(src.existingId)}</div>`;
      src.citationFields.forEach(f => {
        const v = previewSourceField(f, dataRow);
        if (!v) return;
        wrap.querySelector('.src-preview-block').innerHTML +=
          `<div class="src-preview-line"><span class="src-tag">3 ${escHtml(f.tag)}</span> <span class="src-val">${escHtml(v)}</span></div>`;
      });
      wrap.querySelector('.src-preview-block').innerHTML += '</div>';
    } else {
      wrap.innerHTML = '<p class="empty-hint">Bitte Quell-ID eingeben.</p>';
    }
    return wrap;
  }

  const allFields = [...(src.mode !== 'existing' ? src.sourceFields : []), ...src.citationFields];
  const hasAny = allFields.some(f => previewSourceField(f, dataRow));
  if (!hasAny) { wrap.innerHTML = '<p class="empty-hint">Noch keine Felder ausgefüllt.</p>'; return wrap; }

  if (src.mode !== 'existing') {
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
  }

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
