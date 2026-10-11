/**
 * sources-ui.js - Quelleneinstellungen UI mit Chip/Drag&Drop
 */

let sourceDragData = null;

function initSources() {
  sourceDefs = [];
  renderAllSources();
  const addBtn = document.getElementById('btn-add-source');
  if (addBtn) {
    addBtn.onclick = () => {
      const src = createSourceDef();
      src.name = 'Quelle ' + (sourceDefs.length + 1);
      sourceDefs.push(src);
      renderAllSources();
    };
  }
}

function renderAllSources() {
  const container = document.getElementById('sources-container');
  if (!container) return;
  container.innerHTML = '';

  // Chip-Palette oben
  container.appendChild(buildSourcePalette());

  if (sourceDefs.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.textContent = 'Noch keine Quellen definiert. Klicken Sie auf "+ Quelle hinzufuegen".';
    container.appendChild(hint);
    return;
  }
  sourceDefs.forEach(src => container.appendChild(renderSourceDef(src)));
}

// ---- Chip-Palette (Spalten + Variablen + Fester Wert) ----
function buildSourcePalette() {
  const palette = document.createElement('div');
  palette.className = 'source-palette';

  // Spalten
  if (headers && headers.length > 0) {
    const title = document.createElement('div');
    title.className = 'palette-section-title';
    title.textContent = 'Tabellenspalten';
    palette.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'chip-grid';
    headers.forEach((colName, colIdx) => {
      if (ignoredColumns && ignoredColumns.has(colIdx)) return;
      const chip = document.createElement('div');
      chip.className = 'col-chip';
      chip.draggable = true;
      const example = getSourceColExample(colIdx);
      chip.innerHTML = '<span class="chip-name">' + escHtml(colName) + '</span>' +
        (example ? '<span class="chip-val">' + escHtml(example) + '</span>' : '');
      chip.addEventListener('dragstart', e => {
        sourceDragData = { type: 'col', colIdx, label: colName };
        chip.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      grid.appendChild(chip);
    });
    palette.appendChild(grid);
  }

  // Globale Variablen
  const gvars = (typeof collectGlobalVars === 'function') ? collectGlobalVars() : {};
  const varNames = Object.keys(gvars);
  if (varNames.length > 0) {
    const title = document.createElement('div');
    title.className = 'palette-section-title';
    title.textContent = 'Globale Variablen';
    palette.appendChild(title);
    const grid = document.createElement('div');
    grid.className = 'chip-grid';
    varNames.forEach(varName => {
      const chip = document.createElement('div');
      chip.className = 'col-chip var-chip';
      chip.draggable = true;
      chip.innerHTML = '<span class="chip-name">' + escHtml(varName) + '</span><span class="chip-val">' + escHtml(gvars[varName]) + '</span>';
      chip.addEventListener('dragstart', e => {
        sourceDragData = { type: 'var', varName, label: varName };
        chip.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      grid.appendChild(chip);
    });
    palette.appendChild(grid);
  }

  // Fester Wert
  const staticTitle = document.createElement('div');
  staticTitle.className = 'palette-section-title';
  staticTitle.textContent = 'Manuelle Eingabe';
  palette.appendChild(staticTitle);
  const staticChip = document.createElement('div');
  staticChip.className = 'col-chip static-chip';
  staticChip.draggable = true;
  staticChip.innerHTML = '<span class="chip-name">Fester Wert</span><span class="chip-val">fuer alle Zeilen gleich</span>';
  staticChip.addEventListener('dragstart', e => {
    sourceDragData = { type: 'static', value: '', label: 'Fester Wert' };
    staticChip.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
  });
  staticChip.addEventListener('dragend', () => staticChip.classList.remove('dragging'));
  palette.appendChild(staticChip);

  return palette;
}

function getSourceColExample(colIdx) {
  const row = (typeof getFirstDataRow === 'function') ? getFirstDataRow() : [];
  const v = row[colIdx];
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
}

// ---- Render one source definition ----
function renderSourceDef(src) {
  const card = document.createElement('div');
  card.className = 'source-card';

  // Header
  const header = document.createElement('div');
  header.className = 'source-card-header';
  header.innerHTML =
    '<span class="source-icon">&#128196;</span>' +
    '<input class="source-name-input" value="' + escHtml(src.name) + '" placeholder="Quellenbezeichnung" />' +
    '<button class="btn-icon btn-remove-source" title="Quelle entfernen">&#10005;</button>';
  header.querySelector('.source-name-input').addEventListener('input', e => { src.name = e.target.value; });
  header.querySelector('.btn-remove-source').addEventListener('click', () => {
    sourceDefs = sourceDefs.filter(s => s.id !== src.id);
    renderAllSources();
  });
  card.appendChild(header);

  // Mode toggle
  const modeRow = document.createElement('div');
  modeRow.className = 'source-mode-row';
  SOURCE_MODES.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'toggle-btn' + (src.mode === m.value ? ' active' : '');
    btn.textContent = m.label;
    btn.title = m.desc;
    btn.addEventListener('click', () => { src.mode = m.value; renderAllSources(); });
    modeRow.appendChild(btn);
  });
  card.appendChild(modeRow);

  if (src.mode === 'existing') {
    const idRow = document.createElement('div');
    idRow.className = 'source-existing-row';
    idRow.innerHTML = '<label>GEDCOM-ID: <input class="source-existing-input" value="' + escHtml(src.existingId) + '" placeholder="z.B. @S1@" /></label>';
    idRow.querySelector('input').addEventListener('input', e => { src.existingId = e.target.value; });
    card.appendChild(idRow);
  } else {
    // Source fields
    const sfSection = document.createElement('div');
    sfSection.className = 'source-fields-section';
    sfSection.innerHTML = '<div class="source-fields-title">Quellenfelder <span class="source-fields-hint">(werden im SOUR-Record gespeichert, gleich fuer alle Zeilen)</span></div>';
    src.sourceFields.forEach(field => sfSection.appendChild(renderSourceChipField(field, src)));
    sfSection.appendChild(buildAddFieldBtn(AVAILABLE_SOURCE_FIELDS, tag => {
      const def = AVAILABLE_SOURCE_FIELDS.find(f => f.tag === tag);
      src.sourceFields.push(createSourceFieldDef(tag, def ? def.label : tag));
      renderAllSources();
    }));
    card.appendChild(sfSection);
  }

  // Citation fields
  const cfSection = document.createElement('div');
  cfSection.className = 'source-fields-section';
  cfSection.innerHTML = '<div class="source-fields-title">Zitationsfelder <span class="source-fields-hint">(pro Datensatz unterschiedlich)</span></div>';
  src.citationFields.forEach(field => cfSection.appendChild(renderSourceChipField(field, src)));
  cfSection.appendChild(buildAddFieldBtn(AVAILABLE_CITATION_FIELDS, tag => {
    const def = AVAILABLE_CITATION_FIELDS.find(f => f.tag === tag);
    src.citationFields.push(createSourceFieldDef(tag, def ? def.label : tag));
    renderAllSources();
  }));
  card.appendChild(cfSection);

  // attachTo checkboxes
  const attachRow = document.createElement('div');
  attachRow.className = 'source-attach-row';
  attachRow.innerHTML = '<span class="attach-label">Automatisch zitieren bei:</span>';
  [['person', 'Person'], ['events', 'Ereignissen']].forEach(([key, label]) => {
    const lbl = document.createElement('label');
    lbl.className = 'attach-checkbox';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = src.attachTo[key];
    cb.addEventListener('change', e => { src.attachTo[key] = e.target.checked; });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + label));
    attachRow.appendChild(lbl);
  });
  card.appendChild(attachRow);

  return card;
}

// ---- Chip-Drop-Zone fuer ein Quellenfeld ----
function renderSourceChipField(field, src) {
  const row = document.createElement('div');
  row.className = 'source-chip-field-row';

  const label = document.createElement('div');
  label.className = 'source-chip-field-label';
  label.innerHTML = escHtml(field.label) + ' <span class="source-field-tag">' + escHtml(field.tag) + '</span>';
  row.appendChild(label);

  const zone = document.createElement('div');
  zone.className = 'field-drop-zone' + (field.sources.length === 0 ? ' empty' : '');
  field.sources.forEach(s => zone.appendChild(renderSrcChip(s, field, src)));

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (!sourceDragData) return;
    let s = Object.assign({}, sourceDragData);
    if (s.type === 'static') {
      const val = prompt('Festen Wert eingeben:');
      if (val === null) return;
      s.value = val;
      s.label = val || '(leer)';
    }
    addSourceToSrcField(field, s);
    renderAllSources();
  });
  if (field.sources.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'drop-hint';
    hint.textContent = 'Hierher ziehen';
    zone.appendChild(hint);
  }
  row.appendChild(zone);

  // Preview
  const preview = document.createElement('div');
  preview.className = 'field-preview-val';
  preview.textContent = previewSourceField(field, getFirstDataRow()) || '';
  row.appendChild(preview);

  // Remove field button
  const rmBtn = document.createElement('button');
  rmBtn.className = 'btn-icon field-remove';
  rmBtn.title = 'Feld entfernen';
  rmBtn.innerHTML = '&#10005;';
  rmBtn.addEventListener('click', () => {
    src.sourceFields = src.sourceFields.filter(f => f.id !== field.id);
    src.citationFields = src.citationFields.filter(f => f.id !== field.id);
    renderAllSources();
  });
  row.appendChild(rmBtn);

  return row;
}

function renderSrcChip(s, field, src) {
  const chip = document.createElement('div');
  chip.className = 'source-chip' + (s.type === 'static' ? ' source-static' : s.type === 'var' ? ' source-var' : '');
  const label = s.type === 'col' ? (headers[s.colIdx] || 'Sp.' + s.colIdx) :
                s.type === 'var' ? s.varName : '"' + s.value + '"';
  chip.innerHTML = escHtml(label) + ' <button class="chip-remove" title="Entfernen">&times;</button>';
  chip.querySelector('.chip-remove').addEventListener('click', e => {
    e.stopPropagation();
    removeSourceFromSrcField(field, s.id);
    renderAllSources();
  });
  return chip;
}

function buildAddFieldBtn(options, onSelect) {
  return createAddButton('+ Feld hinzufuegen', options.map(o => ({ path: o.tag, label: o.label })), onSelect);
}

function updateSourcePreview() {} // Kompatibilitaets-Stub
