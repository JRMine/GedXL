/**
 * sources-ui.js - Quelleneinstellungen UI (Mapping-identisches Layout)
 */

let sourceDragData = null;
let sourcesLeft, sourcesCols, sourcesRight, sourcesPreviewCard, sourcesPreviewRowSelect;

function initSources() {
  sourceDefs = [];
  sourcesLeft           = document.getElementById('sources-left');
  sourcesCols           = document.getElementById('sources-cols');
  sourcesRight          = document.getElementById('sources-right');
  sourcesPreviewCard    = document.getElementById('sources-preview-card');
  sourcesPreviewRowSelect = document.getElementById('sources-preview-row-select');

  document.getElementById('btn-add-source').onclick = () => {
    const src = createSourceDef();
    src.name = 'Quelle ' + (sourceDefs.length + 1);
    sourceDefs.push(src);
    renderAllSources();
    renderSourcesPreview();
  };

  populateSourcesPreviewRowSelect();
  renderAllSources();
}

function populateSourcesPreviewRowSelect() {
  if (!sourcesPreviewRowSelect) return;
  sourcesPreviewRowSelect.innerHTML = '';
  classifications.forEach((cls, i) => {
    if (cls.type !== 'DATA') return;
    const row = currentRows[i];
    const opt = document.createElement('option');
    opt.value = i;
    const preview = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').slice(0, 2).join(', ');
    opt.textContent = 'Zeile ' + (i + 1) + ': ' + (preview || '(leer)');
    sourcesPreviewRowSelect.appendChild(opt);
  });
  sourcesPreviewRowSelect.addEventListener('change', renderSourcesPreview);
}

function getSourcesPreviewRow() {
  const idx = sourcesPreviewRowSelect ? parseInt(sourcesPreviewRowSelect.value) : -1;
  if (idx >= 0 && currentRows[idx]) return currentRows[idx];
  return getFirstDataRow();
}

// ---- Render alle Spalten + Quellen ----
function renderAllSources() {
  renderSourcePalette();
  renderSourceList();
  renderSourcesPreview();
}

// ---- Spalten-Palette (Col 1 + Col 2) ----
function renderSourcePalette() {
  if (!sourcesLeft || !sourcesCols) return;
  sourcesLeft.innerHTML = '';
  sourcesCols.innerHTML = '';

  // Col 2: Tabellenspalten
  const colsTitle = document.createElement('h3');
  colsTitle.className = 'palette-title';
  colsTitle.textContent = 'Verfuegbare Spalten';
  sourcesCols.appendChild(colsTitle);
  const colsHint = document.createElement('p');
  colsHint.className = 'palette-hint';
  colsHint.textContent = 'Per Drag & Drop auf ein Feld ziehen.';
  sourcesCols.appendChild(colsHint);
  const colGrid = document.createElement('div');
  colGrid.className = 'chip-grid';
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
    colGrid.appendChild(chip);
  });
  sourcesCols.appendChild(colGrid);

  // Col 1: Extras
  const leftTitle = document.createElement('h3');
  leftTitle.className = 'palette-title';
  leftTitle.textContent = 'Extras';
  sourcesLeft.appendChild(leftTitle);

  const gvars = (typeof collectGlobalVars === 'function') ? collectGlobalVars() : {};
  const varNames = Object.keys(gvars);
  if (varNames.length > 0) {
    const gTitle = document.createElement('div');
    gTitle.className = 'palette-section-title';
    gTitle.textContent = 'Globale Variablen';
    sourcesLeft.appendChild(gTitle);
    const gGrid = document.createElement('div');
    gGrid.className = 'chip-grid-single';
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
      gGrid.appendChild(chip);
    });
    sourcesLeft.appendChild(gGrid);
  }

  const staticTitle = document.createElement('div');
  staticTitle.className = 'palette-section-title';
  staticTitle.textContent = 'Manuelle Eingabe';
  sourcesLeft.appendChild(staticTitle);
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
  sourcesLeft.appendChild(staticChip);
}

function getSourceColExample(colIdx) {
  const row = (typeof getFirstDataRow === 'function') ? getFirstDataRow() : [];
  const v = row[colIdx];
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
}

// ---- Quellen-Liste (Col 3) ----
function renderSourceList() {
  if (!sourcesRight) return;
  sourcesRight.innerHTML = '';
  if (sourceDefs.length === 0) {
    const hint = document.createElement('p');
    hint.className = 'empty-hint';
    hint.style.padding = '20px';
    hint.textContent = 'Noch keine Quellen. Klicken Sie auf "+ Weitere Quelle hinzufuegen".';
    sourcesRight.appendChild(hint);
    return;
  }
  sourceDefs.forEach(src => sourcesRight.appendChild(renderSourceDef(src)));
}

// ---- Eine Quellen-Karte ----
function renderSourceDef(src) {
  const card = document.createElement('div');
  card.className = 'person-card';

  // Header
  const header = document.createElement('div');
  header.className = 'person-card-header';
  header.innerHTML =
    '<span class="person-icon">&#128196;</span>' +
    '<input class="person-label-input" value="' + escHtml(src.name) + '" placeholder="Quellenbezeichnung" />' +
    '<button class="btn-icon btn-remove-person" title="Quelle entfernen">&#10005;</button>';
  header.querySelector('.person-label-input').addEventListener('input', e => { src.name = e.target.value; renderSourcesPreview(); });
  header.querySelector('.btn-remove-person').addEventListener('click', () => {
    sourceDefs = sourceDefs.filter(s => s.id !== src.id);
    renderAllSources();
  });
  card.appendChild(header);

  // Mode toggle
  const modeSection = document.createElement('div');
  modeSection.className = 'fields-section';
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
  modeSection.appendChild(modeRow);
  card.appendChild(modeSection);

  if (src.mode === 'existing') {
    const idSection = document.createElement('div');
    idSection.className = 'fields-section';
    idSection.innerHTML = '<div class="fields-section-title">GEDCOM-ID</div>';
    const idRow = document.createElement('div');
    idRow.innerHTML = '<label style="font-size:12px">ID: <input class="source-existing-input" value="' + escHtml(src.existingId) + '" placeholder="z.B. @S1@" /></label>';
    idRow.querySelector('input').addEventListener('input', e => { src.existingId = e.target.value; renderSourcesPreview(); });
    idSection.appendChild(idRow);
    card.appendChild(idSection);
  } else {
    const sfSection = document.createElement('div');
    sfSection.className = 'fields-section';
    sfSection.innerHTML = '<div class="fields-section-title">Quellenfelder <span style="font-size:10px;color:#aaa;font-weight:400">(SOUR-Record, einmalig)</span></div>';
    src.sourceFields.forEach(field => sfSection.appendChild(renderSourceChipField(field, src)));
    sfSection.appendChild(createAddButton('+ Feld', AVAILABLE_SOURCE_FIELDS.map(f => ({ path: f.tag, label: f.label })), tag => {
      const def = AVAILABLE_SOURCE_FIELDS.find(f => f.tag === tag);
      src.sourceFields.push(createSourceFieldDef(tag, def ? def.label : tag));
      renderAllSources();
    }, true));
    card.appendChild(sfSection);
  }

  // Citation fields
  const cfSection = document.createElement('div');
  cfSection.className = 'fields-section';
  cfSection.innerHTML = '<div class="fields-section-title">Zitationsfelder <span style="font-size:10px;color:#aaa;font-weight:400">(pro Datensatz)</span></div>';
  src.citationFields.forEach(field => cfSection.appendChild(renderSourceChipField(field, src)));
  cfSection.appendChild(createAddButton('+ Feld', AVAILABLE_CITATION_FIELDS.map(f => ({ path: f.tag, label: f.label })), tag => {
    const def = AVAILABLE_CITATION_FIELDS.find(f => f.tag === tag);
    src.citationFields.push(createSourceFieldDef(tag, def ? def.label : tag));
    renderAllSources();
  }, true));
  card.appendChild(cfSection);

  // attachTo
  const attachSection = document.createElement('div');
  attachSection.className = 'fields-section';
  attachSection.innerHTML = '<div class="fields-section-title">Automatisch zitieren bei</div>';
  const attachRow = document.createElement('div');
  attachRow.className = 'source-attach-row';
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
  attachSection.appendChild(attachRow);
  card.appendChild(attachSection);

  return card;
}

// ---- Chip-Drop-Zone fuer ein Quellenfeld ----
function renderSourceChipField(field, src) {
  const row = document.createElement('div');
  row.className = 'field-row';

  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = field.label;
  row.appendChild(label);

  const zone = document.createElement('div');
  zone.className = 'field-drop-zone' + (field.sources.length === 0 ? ' empty' : '');
  field.sources.forEach(s => zone.appendChild(renderSrcChip(s, field)));
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

  // Preview value
  const preview = document.createElement('div');
  preview.className = 'field-preview-val';
  preview.textContent = previewSourceField(field, getSourcesPreviewRow()) || '';
  row.appendChild(preview);

  // Remove field
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

function renderSrcChip(s, field) {
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

// ---- Vorschau-Karte (Col 4) ----
function renderSourcesPreview() {
  if (!sourcesPreviewCard) return;
  const dataRow = getSourcesPreviewRow();
  sourcesPreviewCard.innerHTML = '<div class="preview-title">GEDCOM-Vorschau</div>';
  if (sourceDefs.length === 0) {
    sourcesPreviewCard.innerHTML += '<p class="empty-hint">Keine Quellen definiert.</p>';
    return;
  }
  sourceDefs.forEach(src => {
    const block = document.createElement('div');
    block.className = 'preview-person';
    const title = document.createElement('div');
    title.className = 'preview-person-title';
    title.textContent = src.name;
    block.appendChild(title);
    if (src.mode === 'existing') {
      const r = document.createElement('div');
      r.className = 'preview-row';
      r.innerHTML = '<span class="preview-key">ID</span><span class="preview-val">' + escHtml(src.existingId || '?') + '</span>';
      block.appendChild(r);
    } else {
      src.sourceFields.forEach(f => {
        const v = previewSourceField(f, dataRow);
        if (!v) return;
        const r = document.createElement('div');
        r.className = 'preview-row';
        r.innerHTML = '<span class="preview-key">' + escHtml(f.tag) + '</span><span class="preview-val">' + escHtml(v) + '</span>';
        block.appendChild(r);
      });
    }
    if (src.citationFields.some(f => previewSourceField(f, dataRow))) {
      const citTitle = document.createElement('div');
      citTitle.className = 'preview-event-title';
      citTitle.textContent = 'Zitation';
      block.appendChild(citTitle);
      src.citationFields.forEach(f => {
        const v = previewSourceField(f, dataRow);
        if (!v) return;
        const r = document.createElement('div');
        r.className = 'preview-row';
        r.innerHTML = '<span class="preview-key">' + escHtml(f.tag) + '</span><span class="preview-val">' + escHtml(v) + '</span>';
        block.appendChild(r);
      });
    }
    sourcesPreviewCard.appendChild(block);
  });
}

function updateSourcePreview() { renderSourcesPreview(); } // Kompatibilitaets-Stub
