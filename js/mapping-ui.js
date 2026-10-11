/**
 * mapping-ui.js — Mapping Dashboard UI
 */

// ---- DOM Refs (Mapping) ----
const stepMapping = document.getElementById('step-mapping');
const mappingLeft = document.getElementById('mapping-left');
const mappingRight = document.getElementById('mapping-right');
const previewCard = document.getElementById('preview-card');
const btnAddPerson = document.getElementById('btn-add-person');
const previewRowSelect = document.getElementById('preview-row-select');

let dragSourceData = null; // { colIdx, label } — currently dragged column
let activePersonId = null;

// ---- Init mapping step ----
function initMapping() {
  mappingPersons = [];
  // Create default person
  const p = createPerson();
  p.label = 'Person';
  mappingPersons.push(p);
  activePersonId = p.id;

  renderColumnPalette();
  renderPersonList();
  renderPreview();
  populatePreviewRowSelect();
}

// ---- Column palette (left side) ----
function renderColumnPalette() {
  mappingLeft.innerHTML = '';

  const title = document.createElement('h3');
  title.className = 'palette-title';
  title.textContent = 'Verfügbare Spalten';
  mappingLeft.appendChild(title);

  const hint = document.createElement('p');
  hint.className = 'palette-hint';
  hint.textContent = 'Spalten per Drag & Drop auf ein Feld ziehen oder per Klick hinzufügen.';
  mappingLeft.appendChild(hint);

  // Global vars section
  const gvars = collectGlobalVars();
  if (Object.keys(gvars).length > 0) {
    const gTitle = document.createElement('div');
    gTitle.className = 'palette-section-title';
    gTitle.textContent = '🔖 Globale Variablen';
    mappingLeft.appendChild(gTitle);

    Object.entries(gvars).forEach(([varName, value]) => {
      const chip = document.createElement('div');
      chip.className = 'col-chip var-chip';
      chip.draggable = true;
      chip.dataset.type = 'var';
      chip.dataset.varName = varName;
      chip.innerHTML = `<span class="chip-name">${escHtml(varName)}</span><span class="chip-val">${escHtml(value)}</span>`;
      chip.addEventListener('dragstart', (e) => {
        dragSourceData = { type: 'var', varName, label: varName };
        chip.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
      });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      mappingLeft.appendChild(chip);
    });
  }

  // Columns
  const colTitle = document.createElement('div');
  colTitle.className = 'palette-section-title';
  colTitle.textContent = '📋 Tabellenspalten';
  mappingLeft.appendChild(colTitle);

  headers.forEach((colName, colIdx) => {
    if (ignoredColumns.has(colIdx)) return;
    const example = getColExample(colIdx);
    const chip = document.createElement('div');
    chip.className = 'col-chip';
    chip.draggable = true;
    chip.dataset.colIdx = colIdx;
    chip.innerHTML = `<span class="chip-name">${escHtml(colName)}</span>${example ? `<span class="chip-val">${escHtml(example)}</span>` : ''}`;
    chip.addEventListener('dragstart', (e) => {
      dragSourceData = { type: 'col', colIdx, label: colName };
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'copy';
    });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    mappingLeft.appendChild(chip);
  });

  // Static value chip
  const staticChip = document.createElement('div');
  staticChip.className = 'col-chip static-chip';
  staticChip.draggable = true;
  staticChip.innerHTML = `<span class="chip-name">✏️ Fester Wert</span><span class="chip-val">für alle Zeilen gleich</span>`;
  staticChip.addEventListener('dragstart', (e) => {
    dragSourceData = { type: 'static', value: '', label: 'Fester Wert' };
    staticChip.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
  });
  staticChip.addEventListener('dragend', () => staticChip.classList.remove('dragging'));
  const staticTitle = document.createElement('div');
  staticTitle.className = 'palette-section-title';
  staticTitle.textContent = '✏️ Manuelle Eingabe';
  mappingLeft.appendChild(staticTitle);
  mappingLeft.appendChild(staticChip);
}

function getColExample(colIdx) {
  const row = getFirstDataRow();
  const v = row[colIdx];
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
}

// ---- Person list (right side) ----
function renderPersonList() {
  mappingRight.innerHTML = '';

  mappingPersons.forEach(person => {
    const card = document.createElement('div');
    card.className = 'person-card' + (person.id === activePersonId ? ' active' : '');
    card.id = 'person-' + person.id;

    // Card header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'person-card-header';
    cardHeader.innerHTML = `
      <span class="person-icon">👤</span>
      <input class="person-label-input" value="${escHtml(person.label)}" placeholder="Personenbezeichnung" />
      <button class="btn-icon btn-remove-person" title="Person entfernen" data-pid="${person.id}">✕</button>
    `;
    cardHeader.querySelector('.person-label-input').addEventListener('input', e => {
      person.label = e.target.value;
      renderPreview();
    });
    cardHeader.querySelector('.btn-remove-person').addEventListener('click', () => {
      if (mappingPersons.length === 1) { alert('Mindestens eine Person muss vorhanden sein.'); return; }
      mappingPersons = mappingPersons.filter(p => p.id !== person.id);
      if (activePersonId === person.id) activePersonId = mappingPersons[0].id;
      renderPersonList();
      renderPreview();
    });
    card.appendChild(cardHeader);

    // Person fields section
    const fieldsSection = document.createElement('div');
    fieldsSection.className = 'fields-section';
    const fTitle = document.createElement('div');
    fTitle.className = 'fields-section-title';
    fTitle.textContent = 'Personenfelder';
    fieldsSection.appendChild(fTitle);

    // Render existing person fields
    person.fields.forEach(field => {
      fieldsSection.appendChild(renderField(field, person, null));
    });

    // Add field button
    const addFieldBtn = createAddButton('+ Feld hinzufügen', GEDCOM_PERSON_FIELDS, (path) => {
      addPersonField(person, path);
      renderPersonList();
      renderPreview();
    });
    fieldsSection.appendChild(addFieldBtn);
    card.appendChild(fieldsSection);

    // Events section
    const evSection = document.createElement('div');
    evSection.className = 'fields-section';
    const evTitle = document.createElement('div');
    evTitle.className = 'fields-section-title';
    evTitle.textContent = 'Ereignisse';
    evSection.appendChild(evTitle);

    person.events.forEach(ev => {
      evSection.appendChild(renderEvent(ev, person));
    });

    const addEvBtn = createAddButton('+ Ereignis hinzufügen', GEDCOM_EVENT_TYPES.map(e => ({path: e.tag, label: e.label})), (tag) => {
      addEvent(person, tag);
      renderPersonList();
      renderPreview();
    });
    evSection.appendChild(addEvBtn);
    card.appendChild(evSection);

    // Relatives section
    const relSection = document.createElement('div');
    relSection.className = 'fields-section';
    relSection.innerHTML = `<div class="fields-section-title">Verwandte</div>`;
    const relList = document.createElement('div');
    relList.className = 'rel-list';
    person.relatives.forEach(rel => {
      const relItem = document.createElement('div');
      relItem.className = 'rel-item';
      const roleOptions = ['Vater','Mutter','Kind','Partner'].map(r =>
        `<option value="${r}" ${rel.role===r?'selected':''}>${r}</option>`
      ).join('');
      relItem.innerHTML = `
        <select class="rel-role-sel">${roleOptions}</select>
        <input class="rel-name-input" value="${escHtml(rel.label||'')}" placeholder="Bezeichnung (z.B. Vater Beruf)" />
        <button class="btn-icon" title="Entfernen">✕</button>
      `;
      relItem.querySelector('.rel-role-sel').addEventListener('change', e => { rel.role = e.target.value; renderPreview(); });
      relItem.querySelector('.rel-name-input').addEventListener('input', e => { rel.label = e.target.value; renderPreview(); });
      relItem.querySelector('.btn-icon').addEventListener('click', () => {
        person.relatives = person.relatives.filter(r => r.id !== rel.id);
        renderPersonList(); renderPreview();
      });
      relList.appendChild(relItem);
    });
    relSection.appendChild(relList);
    const addRelBtn = document.createElement('button');
    addRelBtn.className = 'btn-secondary btn-small';
    addRelBtn.textContent = '+ Verwandten hinzufügen';
    addRelBtn.addEventListener('click', () => {
      person.relatives.push({ id: newId(), role: 'Vater', label: '' });
      renderPersonList(); renderPreview();
    });
    relSection.appendChild(addRelBtn);
    card.appendChild(relSection);

    mappingRight.appendChild(card);
  });

  // Add person button
  mappingRight.appendChild(btnAddPerson);
}

// ---- Render a single field row ----
function renderField(field, person, ev) {
  const row = document.createElement('div');
  row.className = 'field-row';
  row.id = 'field-' + field.id;

  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = field.label;
  row.appendChild(label);

  const dropZoneEl = document.createElement('div');
  dropZoneEl.className = 'field-drop-zone' + (field.sources.length === 0 ? ' empty' : '');
  dropZoneEl.title = 'Spalte hier ablegen';

  // Existing source chips
  field.sources.forEach(src => {
    dropZoneEl.appendChild(renderSourceChip(src, field));
  });

  // Drop handling
  dropZoneEl.addEventListener('dragover', e => { e.preventDefault(); dropZoneEl.classList.add('drag-over'); });
  dropZoneEl.addEventListener('dragleave', () => dropZoneEl.classList.remove('drag-over'));
  dropZoneEl.addEventListener('drop', e => {
    e.preventDefault();
    dropZoneEl.classList.remove('drag-over');
    if (!dragSourceData) return;
    let src = { ...dragSourceData };
    if (src.type === 'static') {
      const val = prompt('Festen Wert eingeben (gilt für alle Zeilen):');
      if (val === null) return;
      src.value = val;
      src.label = val || '(leer)';
    }
    addSourceToField(field, src);
    renderPersonList();
    renderPreview();
  });

  // Empty hint
  if (field.sources.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'drop-hint';
    hint.textContent = 'Spalte hierher ziehen';
    dropZoneEl.appendChild(hint);
  }

  row.appendChild(dropZoneEl);

  // Preview value
  const previewVal = document.createElement('div');
  previewVal.className = 'field-preview-val';
  const pv = previewFieldValue(field, getFirstDataRow(), collectGlobalVars());
  previewVal.textContent = pv || '';
  row.appendChild(previewVal);

  // Remove field button
  const rmBtn = document.createElement('button');
  rmBtn.className = 'btn-icon field-remove';
  rmBtn.title = 'Feld entfernen';
  rmBtn.textContent = '✕';
  rmBtn.addEventListener('click', () => {
    if (ev) ev.fields = ev.fields.filter(f => f.id !== field.id);
    else person.fields = person.fields.filter(f => f.id !== field.id);
    renderPersonList(); renderPreview();
  });
  row.appendChild(rmBtn);

  return row;
}

// ---- Render a source chip ----
function renderSourceChip(src, field) {
  const chip = document.createElement('div');
  chip.className = 'source-chip';
  if (src.type === 'static') chip.classList.add('source-static');
  if (src.type === 'var') chip.classList.add('source-var');

  const icon = src.type === 'col' ? '📋' : src.type === 'var' ? '🔖' : '✏️';
  const label = src.type === 'col' ? (headers[src.colIdx] || `Sp.${src.colIdx}`) :
                src.type === 'var' ? src.varName : `"${src.value}"`;

  chip.innerHTML = `${icon} ${escHtml(label)} <button class="chip-remove" title="Entfernen">×</button>`;
  chip.querySelector('.chip-remove').addEventListener('click', (e) => {
    e.stopPropagation();
    removeSourceFromField(field, src.id);
    renderPersonList(); renderPreview();
  });
  return chip;
}

// ---- Render an event block ----
function renderEvent(ev, person) {
  const block = document.createElement('div');
  block.className = 'event-block';

  const header = document.createElement('div');
  header.className = 'event-header';
  header.innerHTML = `
    <span class="event-tag">${escHtml(ev.tag)}</span>
    <span class="event-label">${escHtml(ev.label)}</span>
    <button class="btn-icon btn-remove-event" title="Ereignis entfernen">✕</button>
  `;
  header.querySelector('.btn-remove-event').addEventListener('click', () => {
    person.events = person.events.filter(e => e.id !== ev.id);
    renderPersonList(); renderPreview();
  });
  block.appendChild(header);

  // EVEN: custom type input
  if (ev.tag === 'EVEN') {
    const typeRow = document.createElement('div');
    typeRow.className = 'event-type-row';
    typeRow.innerHTML = `<label>Ereignistyp: <input class="event-type-input" value="${escHtml(ev.customType)}" placeholder="z.B. Schuleintritt" /></label>`;
    typeRow.querySelector('input').addEventListener('input', e => { ev.customType = e.target.value; renderPreview(); });
    block.appendChild(typeRow);
  }

  // Fields
  ev.fields.forEach(field => {
    block.appendChild(renderField(field, person, ev));
  });

  // Add field to event
  const addBtn = createAddButton('+ Feld', GEDCOM_EVENT_FIELDS.map(f => ({path: f.path, label: f.label})), (path) => {
    addEventField(ev, path);
    renderPersonList(); renderPreview();
  }, true);
  block.appendChild(addBtn);

  return block;
}

// ---- Generic "add" dropdown button ----
function createAddButton(text, options, onSelect, small = false) {
  const wrap = document.createElement('div');
  wrap.className = 'add-btn-wrap';

  const btn = document.createElement('button');
  btn.className = small ? 'btn-secondary btn-small' : 'btn-secondary';
  btn.textContent = text;

  const dropdown = document.createElement('div');
  dropdown.className = 'add-dropdown hidden';

  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'add-dropdown-item';
    item.textContent = opt.label;
    item.addEventListener('click', () => {
      dropdown.classList.add('hidden');
      onSelect(opt.path);
    });
    dropdown.appendChild(item);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close others
    document.querySelectorAll('.add-dropdown').forEach(d => { if (d !== dropdown) d.classList.add('hidden'); });
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => dropdown.classList.add('hidden'));

  wrap.appendChild(btn);
  wrap.appendChild(dropdown);
  return wrap;
}

// ---- Preview card ----
function renderPreview() {
  if (!previewCard) return;
  const dataRow = getPreviewRow();
  const gvars = collectGlobalVars();

  previewCard.innerHTML = '';

  mappingPersons.forEach(person => {
    const section = document.createElement('div');
    section.className = 'preview-person';

    const title = document.createElement('div');
    title.className = 'preview-person-title';

    // Build display name from NAME fields
    const givn = person.fields.find(f => f.path === 'NAME.GIVN');
    const surn = person.fields.find(f => f.path === 'NAME.SURN');
    const nameStr = [
      givn ? previewFieldValue(givn, dataRow, gvars) : '',
      surn ? previewFieldValue(surn, dataRow, gvars) : ''
    ].filter(Boolean).join(' ') || person.label;
    title.textContent = '👤 ' + nameStr;
    section.appendChild(title);

    // Person fields
    person.fields.forEach(field => {
      const pv = previewFieldValue(field, dataRow, gvars);
      if (!pv) return;
      const row = document.createElement('div');
      row.className = 'preview-row';
      row.innerHTML = `<span class="preview-key">${escHtml(field.label)}</span><span class="preview-val">${escHtml(pv)}</span>`;
      section.appendChild(row);
    });

    // Events
    person.events.forEach(ev => {
      const evBlock = document.createElement('div');
      evBlock.className = 'preview-event';
      const evLabel = ev.tag === 'EVEN' && ev.customType ? ev.customType : ev.label;
      evBlock.innerHTML = `<div class="preview-event-title">📅 ${escHtml(evLabel)}</div>`;
      ev.fields.forEach(field => {
        const pv = previewFieldValue(field, dataRow, gvars);
        if (!pv) return;
        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = `<span class="preview-key">${escHtml(field.label)}</span><span class="preview-val">${escHtml(pv)}</span>`;
        evBlock.appendChild(row);
      });
      section.appendChild(evBlock);
    });

    // Relatives
    if (person.relatives.length > 0) {
      const relBlock = document.createElement('div');
      relBlock.className = 'preview-event';
      relBlock.innerHTML = '<div class="preview-event-title">👪 Verwandte</div>';
      person.relatives.forEach(rel => {
        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = `<span class="preview-key">${escHtml(rel.role)}</span><span class="preview-val">${escHtml(rel.label || '(definiert)')}</span>`;
        relBlock.appendChild(row);
      });
      section.appendChild(relBlock);
    }

    previewCard.appendChild(section);
  });

  if (previewCard.children.length === 0) {
    previewCard.innerHTML = '<p class="empty-hint">Noch keine Felder zugeordnet.</p>';
  }
}

function getPreviewRow() {
  const sel = document.getElementById('preview-row-select');
  const idx = sel ? parseInt(sel.value) : -1;
  if (idx >= 0 && currentRows[idx]) return currentRows[idx];
  return getFirstDataRow();
}

function populatePreviewRowSelect() {
  const sel = document.getElementById('preview-row-select');
  if (!sel) return;
  sel.innerHTML = '';
  classifications.forEach((cls, i) => {
    if (cls.type !== 'DATA') return;
    const opt = document.createElement('option');
    opt.value = i;
    const row = currentRows[i];
    const preview = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').slice(0, 2).join(', ');
    opt.textContent = `Zeile ${i + 1}: ${preview || '(leer)'}`;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', renderPreview);
}
