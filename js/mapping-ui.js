/**
 * mapping-ui.js - Mapping Dashboard UI
 */

let mappingLeft, mappingCols, mappingRight, previewCard, btnAddPerson, previewRowSelect;

function initMappingDomRefs() {
  mappingLeft      = document.getElementById('mapping-left');
  mappingCols      = document.getElementById('mapping-cols');
  mappingRight     = document.getElementById('mapping-right');
  previewCard      = document.getElementById('preview-card');
  btnAddPerson     = document.getElementById('btn-add-person');
  previewRowSelect = document.getElementById('preview-row-select');

  btnAddPerson.addEventListener('click', () => {
    const p = createPerson();
    p.label = 'Person ' + (mappingPersons.length + 1);
    mappingPersons.push(p);
    activePersonId = p.id;
    renderPersonList();
    renderPreview();
  });

  document.getElementById('btn-to-export').addEventListener('click', () => {
    alert('Schritt 5 (Export) ist noch in Entwicklung.');
  });
}

let dragSourceData = null;
let activePersonId = null;

function initMapping() {
  initMappingDomRefs();
  mappingPersons = [];
  const p = createPerson();
  p.label = 'Person 1';
  mappingPersons.push(p);
  activePersonId = p.id;
  renderColumnPalette();
  renderPersonList();
  renderPreview();
  populatePreviewRowSelect();
}

// ---- Column palette ----
function renderColumnPalette() {
  mappingLeft.innerHTML = '';
  mappingCols.innerHTML = '';

  const usedCols = new Set();
  mappingPersons.forEach(p => {
    const collect = fields => fields.forEach(f => f.sources.forEach(s => { if (s.type === 'col') usedCols.add(s.colIdx); }));
    collect(p.fields);
    p.events.forEach(ev => collect(ev.fields));
  });

  // Col 2: Tabellenspalten
  const colsTitle = document.createElement('h3');
  colsTitle.className = 'palette-title';
  colsTitle.textContent = 'Verfuegbare Spalten';
  mappingCols.appendChild(colsTitle);
  const colsHint = document.createElement('p');
  colsHint.className = 'palette-hint';
  colsHint.textContent = 'Per Drag & Drop auf ein Feld ziehen.';
  mappingCols.appendChild(colsHint);
  const colGrid = document.createElement('div');
  colGrid.className = 'chip-grid';
  headers.forEach((colName, colIdx) => {
    if (ignoredColumns.has(colIdx)) return;
    const example = getColExample(colIdx);
    const used = usedCols.has(colIdx);
    const chip = document.createElement('div');
    chip.className = 'col-chip' + (used ? ' col-chip-used' : '');
    chip.title = used ? 'Bereits zugeordnet' : colName;
    chip.draggable = true;
    chip.innerHTML = '<span class="chip-name">' + escHtml(colName) + (used ? ' <span class="chip-used-dot">&#10003;</span>' : '') + '</span>' +
      (example ? '<span class="chip-val">' + escHtml(example) + '</span>' : '');
    chip.addEventListener('dragstart', e => { dragSourceData = { type: 'col', colIdx, label: colName }; chip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
    chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
    colGrid.appendChild(chip);
  });
  mappingCols.appendChild(colGrid);

  // Col 1: Extras (vars, static, sources)
  const leftTitle = document.createElement('h3');
  leftTitle.className = 'palette-title';
  leftTitle.textContent = 'Extras';
  mappingLeft.appendChild(leftTitle);

  const gvars = collectGlobalVars();
  if (Object.keys(gvars).length > 0) {
    const gTitle = document.createElement('div');
    gTitle.className = 'palette-section-title';
    gTitle.textContent = 'Globale Variablen';
    mappingLeft.appendChild(gTitle);
    const gGrid = document.createElement('div');
    gGrid.className = 'chip-grid-single';
    Object.entries(gvars).forEach(([varName, value]) => {
      const chip = document.createElement('div');
      chip.className = 'col-chip var-chip';
      chip.draggable = true;
      chip.innerHTML = '<span class="chip-name">' + escHtml(varName) + '</span><span class="chip-val">' + escHtml(value) + '</span>';
      chip.addEventListener('dragstart', e => { dragSourceData = { type: 'var', varName, label: varName }; chip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      gGrid.appendChild(chip);
    });
    mappingLeft.appendChild(gGrid);
  }

  const staticTitle = document.createElement('div');
  staticTitle.className = 'palette-section-title';
  staticTitle.textContent = 'Manuelle Eingabe';
  mappingLeft.appendChild(staticTitle);
  const staticGrid = document.createElement('div');
  staticGrid.className = 'chip-grid-single';
  const staticChip = document.createElement('div');
  staticChip.className = 'col-chip static-chip';
  staticChip.draggable = true;
  staticChip.innerHTML = '<span class="chip-name">Fester Wert</span><span class="chip-val">fuer alle Zeilen gleich</span>';
  staticChip.addEventListener('dragstart', e => { dragSourceData = { type: 'static', value: '', label: 'Fester Wert' }; staticChip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
  staticChip.addEventListener('dragend', () => staticChip.classList.remove('dragging'));
  staticGrid.appendChild(staticChip);
  mappingLeft.appendChild(staticGrid);

  if (sourceDefs.length > 0) {
    const srcTitle = document.createElement('div');
    srcTitle.className = 'palette-section-title';
    srcTitle.textContent = 'Quellen';
    mappingLeft.appendChild(srcTitle);
    const srcHint = document.createElement('p');
    srcHint.className = 'palette-hint';
    srcHint.textContent = 'Auf Person oder Ereignis ziehen.';
    mappingLeft.appendChild(srcHint);
    const srcGrid = document.createElement('div');
    srcGrid.className = 'chip-grid-single';
    sourceDefs.forEach(src => {
      const chip = document.createElement('div');
      chip.className = 'col-chip src-chip';
      chip.draggable = true;
      const dataRow = getFirstDataRow();
      const titleField = src.sourceFields.find(f => f.tag === 'TITL');
      const modeLabel = src.mode === 'existing'
        ? ('ID: ' + (src.existingId || '?'))
        : (titleField ? previewSourceField(titleField, dataRow) || src.name : src.name);
      chip.innerHTML = '<span class="chip-name">' + escHtml(src.name) + '</span><span class="chip-val">' + escHtml(modeLabel) + '</span>';
      chip.addEventListener('dragstart', e => { dragSourceData = { type: 'source', sourceId: src.id, label: src.name }; chip.classList.add('dragging'); e.dataTransfer.effectAllowed = 'copy'; });
      chip.addEventListener('dragend', () => chip.classList.remove('dragging'));
      srcGrid.appendChild(chip);
    });
    mappingLeft.appendChild(srcGrid);
  }
}

function getColExample(colIdx) {
  const row = getFirstDataRow();
  const v = row[colIdx];
  return v !== null && v !== undefined && String(v).trim() !== '' ? String(v).trim() : null;
}

// ---- Person list ----
function renderPersonList() {
  mappingRight.innerHTML = '';
  renderColumnPalette();

  mappingPersons.forEach(person => {
    const card = document.createElement('div');
    card.className = 'person-card' + (person.id === activePersonId ? ' active' : '');
    card.id = 'person-' + person.id;

    // Header
    const cardHeader = document.createElement('div');
    cardHeader.className = 'person-card-header';
    cardHeader.innerHTML =
      '<span class="person-icon">&#128100;</span>' +
      '<input class="person-label-input" value="' + escHtml(person.label) + '" placeholder="Personenbezeichnung" />' +
      '<button class="btn-icon btn-remove-person" title="Person entfernen">&#10005;</button>';
    cardHeader.querySelector('.person-label-input').addEventListener('input', e => { person.label = e.target.value; renderPreview(); });
    cardHeader.querySelector('.btn-remove-person').addEventListener('click', () => {
      if (mappingPersons.length === 1) { alert('Mindestens eine Person muss vorhanden sein.'); return; }
      mappingPersons.forEach(p => { p.relatives = p.relatives.filter(r => r.targetPersonId !== person.id); });
      mappingPersons = mappingPersons.filter(p => p.id !== person.id);
      if (activePersonId === person.id) activePersonId = mappingPersons[0].id;
      renderPersonList(); renderPreview();
    });
    card.appendChild(cardHeader);

    // Person fields
    const fieldsSection = document.createElement('div');
    fieldsSection.className = 'fields-section';
    fieldsSection.innerHTML = '<div class="fields-section-title">Personenfelder</div>';
    person.fields.forEach(field => fieldsSection.appendChild(renderField(field, person, null)));
    fieldsSection.appendChild(createAddButton('+ Feld hinzufuegen', GEDCOM_PERSON_FIELDS, path => {
      addPersonField(person, path); renderPersonList(); renderPreview();
    }));
    card.appendChild(fieldsSection);

    // Events
    const evSection = document.createElement('div');
    evSection.className = 'fields-section';
    evSection.innerHTML = '<div class="fields-section-title">Ereignisse</div>';
    person.events.forEach(ev => evSection.appendChild(renderEvent(ev, person)));
    evSection.appendChild(createAddButton('+ Ereignis hinzufuegen', GEDCOM_EVENT_TYPES.map(e => ({path: e.tag, label: e.label})), tag => {
      addEvent(person, tag); renderPersonList(); renderPreview();
    }));
    card.appendChild(evSection);

    // Relatives
    const relSection = document.createElement('div');
    relSection.className = 'fields-section';
    relSection.innerHTML = '<div class="fields-section-title">Beziehungen zu anderen Personen</div>';
    const otherPersons = mappingPersons.filter(p => p.id !== person.id);
    if (otherPersons.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'rel-hint';
      hint.textContent = 'Fuegens Sie eine weitere Person hinzu, um Beziehungen definieren zu koennen.';
      relSection.appendChild(hint);
    } else {
      const relList = document.createElement('div');
      relList.className = 'rel-list';
      person.relatives.forEach(rel => {
        const relItem = document.createElement('div');
        relItem.className = 'rel-item';
        const isFam = ['Vater','Mutter','Kind','Partner','Geschwister'].includes(rel.role);
        const roleOpts = ['Vater','Mutter','Kind','Partner','Geschwister'].map(r =>
          '<option value="' + r + '"' + (rel.role === r ? ' selected' : '') + '>' + r + '</option>').join('');
        const personOpts = otherPersons.map(p =>
          '<option value="' + p.id + '"' + (rel.targetPersonId === p.id ? ' selected' : '') + '>' + escHtml(p.label) + '</option>').join('');
        relItem.innerHTML =
          '<span class="rel-badge ' + (isFam ? 'rel-fam' : 'rel-asso') + '">' + (isFam ? 'FAM' : 'ASSO') + '</span>' +
          '<span class="rel-desc">ist</span>' +
          (isFam
            ? '<select class="rel-role-sel">' + roleOpts + '</select>'
            : '<input class="rel-role-input" value="' + escHtml(rel.role) + '" placeholder="z.B. Pate, Zeuge..." />') +
          '<span class="rel-desc">von</span>' +
          '<select class="rel-person-sel">' + personOpts + '</select>' +
          '<button class="btn-icon rel-toggle-btn" title="' + (isFam ? 'Zu ASSO wechseln' : 'Zu FAM wechseln') + '">' + (isFam ? '&#8594;ASSO' : '&#8594;FAM') + '</button>' +
          '<button class="btn-icon" title="Entfernen">&#10005;</button>';

        if (isFam) {
          relItem.querySelector('.rel-role-sel').addEventListener('change', e => { rel.role = e.target.value; renderPersonList(); renderPreview(); });
        } else {
          relItem.querySelector('.rel-role-input').addEventListener('input', e => { rel.role = e.target.value; renderPreview(); });
        }
        relItem.querySelector('.rel-person-sel').addEventListener('change', e => { rel.targetPersonId = e.target.value; renderPreview(); });
        relItem.querySelector('.rel-toggle-btn').addEventListener('click', () => {
          rel.role = isFam ? 'Pate' : 'Kind';
          renderPersonList(); renderPreview();
        });
        relItem.querySelector('.btn-icon:last-child').addEventListener('click', () => {
          person.relatives = person.relatives.filter(r => r.id !== rel.id);
          renderPersonList(); renderPreview();
        });
        relList.appendChild(relItem);
      });
      relSection.appendChild(relList);

      const btnWrap = document.createElement('div');
      btnWrap.className = 'rel-add-btns';
      const addFamBtn = document.createElement('button');
      addFamBtn.className = 'btn-secondary btn-small';
      addFamBtn.textContent = '+ FAM-Beziehung';
      addFamBtn.title = 'Vater, Mutter, Kind, Partner, Geschwister';
      addFamBtn.addEventListener('click', () => {
        person.relatives.push({ id: newId(), role: 'Kind', targetPersonId: otherPersons[0].id });
        renderPersonList(); renderPreview();
      });
      const addAssoBtn = document.createElement('button');
      addAssoBtn.className = 'btn-secondary btn-small';
      addAssoBtn.textContent = '+ ASSO-Beziehung';
      addAssoBtn.title = 'Pate, Zeuge, Arbeitgeber, beliebige Rolle...';
      addAssoBtn.addEventListener('click', () => {
        person.relatives.push({ id: newId(), role: 'Pate', targetPersonId: otherPersons[0].id });
        renderPersonList(); renderPreview();
      });
      btnWrap.appendChild(addFamBtn);
      btnWrap.appendChild(addAssoBtn);
      relSection.appendChild(btnWrap);
    }
    card.appendChild(relSection);

    // Implied (reverse) relationships from other persons
    const reverseRoleMap = { 'Vater': 'Kind', 'Mutter': 'Kind', 'Kind': 'Elternteil', 'Partner': 'Partner', 'Geschwister': 'Geschwister' };
    const FAM_ROLES = ['Vater','Mutter','Kind','Partner','Geschwister'];
    const impliedRels = [];
    mappingPersons.forEach(other => {
      if (other.id === person.id) return;
      other.relatives.forEach(rel => {
        if (rel.targetPersonId === person.id) {
          const isFam = FAM_ROLES.includes(rel.role);
          impliedRels.push({
            fromLabel: other.label,
            role: isFam ? (reverseRoleMap[rel.role] || rel.role) : rel.role,
            type: isFam ? 'FAM' : 'ASSO'
          });
        }
      });
    });
    if (impliedRels.length > 0) {
      const impliedSection = document.createElement('div');
      impliedSection.className = 'fields-section implied-rels-section';
      impliedSection.innerHTML = '<div class="fields-section-title">Abgeleitete Beziehungen <span class="implied-hint-badge">automatisch</span></div>';
      impliedRels.forEach(ir => {
        const item = document.createElement('div');
        item.className = 'implied-rel-item';
        item.innerHTML = '<span class="rel-badge ' + (ir.type === 'FAM' ? 'rel-fam' : 'rel-asso') + '">' + ir.type + '</span> ist ' + escHtml(ir.role) + ' von ' + escHtml(ir.fromLabel);
        impliedSection.appendChild(item);
      });
      const note = document.createElement('p');
      note.className = 'implied-rel-note';
      note.textContent = 'Diese Beziehung ergibt sich automatisch und muss nicht nochmal eingetragen werden.';
      impliedSection.appendChild(note);
      card.appendChild(impliedSection);
    }

    // Person citations
    const personCitBlock = document.createElement('div');
    personCitBlock.className = 'fields-section person-citations-block';
    personCitBlock.innerHTML = '<div class="fields-section-title">Quellenzitation zur Person</div>';
    personCitBlock.addEventListener('dragover', e => { e.preventDefault(); personCitBlock.classList.add('drag-over-event'); });
    personCitBlock.addEventListener('dragleave', () => personCitBlock.classList.remove('drag-over-event'));
    personCitBlock.addEventListener('drop', e => {
      e.preventDefault();
      personCitBlock.classList.remove('drag-over-event');
      if (!dragSourceData || dragSourceData.type !== 'source') return;
      if (!person.citations.find(c => c.sourceId === dragSourceData.sourceId)) {
        person.citations.push({ id: newId(), sourceId: dragSourceData.sourceId });
        renderPersonList(); renderPreview();
      }
    });
    const autoPersonCits = sourceDefs.filter(s => s.attachTo.person);
    autoPersonCits.forEach(src => personCitBlock.appendChild(renderCitationRow(src, null, null, true)));
    person.citations.filter(c => !autoPersonCits.find(s => s.id === c.sourceId)).forEach(cit => {
      const src = sourceDefs.find(s => s.id === cit.sourceId);
      if (!src) return;
      const row = renderCitationRow(src, null, cit, false);
      row.querySelector('.cit-remove').addEventListener('click', () => {
        person.citations = person.citations.filter(c => c.id !== cit.id);
        renderPersonList(); renderPreview();
      });
      personCitBlock.appendChild(row);
    });
    if (autoPersonCits.length === 0 && person.citations.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'event-drop-source-hint';
      hint.textContent = 'Quelle aus linker Palette hierher ziehen';
      personCitBlock.appendChild(hint);
    }
    card.appendChild(personCitBlock);

    mappingRight.appendChild(card);
  });

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
  field.sources.forEach(src => dropZoneEl.appendChild(renderSourceChip(src, field)));
  dropZoneEl.addEventListener('dragover', e => { e.preventDefault(); dropZoneEl.classList.add('drag-over'); });
  dropZoneEl.addEventListener('dragleave', () => dropZoneEl.classList.remove('drag-over'));
  dropZoneEl.addEventListener('drop', e => {
    e.preventDefault();
    dropZoneEl.classList.remove('drag-over');
    if (!dragSourceData) return;
    let src = Object.assign({}, dragSourceData);
    if (src.type === 'static') {
      const val = prompt('Festen Wert eingeben (gilt fuer alle Zeilen):');
      if (val === null) return;
      src.value = val;
      src.label = val || '(leer)';
    }
    addSourceToField(field, src);
    renderPersonList();
    renderPreview();
  });
  if (field.sources.length === 0) {
    const hint = document.createElement('span');
    hint.className = 'drop-hint';
    hint.textContent = 'Spalte hierher ziehen';
    dropZoneEl.appendChild(hint);
  }
  row.appendChild(dropZoneEl);

  const previewVal = document.createElement('div');
  previewVal.className = 'field-preview-val';
  previewVal.textContent = previewFieldValue(field, getFirstDataRow(), collectGlobalVars()) || '';
  row.appendChild(previewVal);

  const rmBtn = document.createElement('button');
  rmBtn.className = 'btn-icon field-remove';
  rmBtn.title = 'Feld entfernen';
  rmBtn.innerHTML = '&#10005;';
  rmBtn.addEventListener('click', () => {
    if (ev) ev.fields = ev.fields.filter(f => f.id !== field.id);
    else person.fields = person.fields.filter(f => f.id !== field.id);
    renderPersonList(); renderPreview();
  });
  row.appendChild(rmBtn);

  return row;
}

// ---- Render a source chip inside a field drop zone ----
function renderSourceChip(src, field) {
  const chip = document.createElement('div');
  chip.className = 'source-chip';
  if (src.type === 'static') chip.classList.add('source-static');
  if (src.type === 'var') chip.classList.add('source-var');
  const label = src.type === 'col' ? (headers[src.colIdx] || 'Sp.' + src.colIdx) :
                src.type === 'var' ? src.varName : '"' + src.value + '"';
  chip.innerHTML = escHtml(label) + ' <button class="chip-remove" title="Entfernen">&times;</button>';
  chip.querySelector('.chip-remove').addEventListener('click', e => {
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

  block.addEventListener('dragover', e => { e.preventDefault(); block.classList.add('drag-over-event'); });
  block.addEventListener('dragleave', () => block.classList.remove('drag-over-event'));
  block.addEventListener('drop', e => {
    e.preventDefault();
    block.classList.remove('drag-over-event');
    if (!dragSourceData || dragSourceData.type !== 'source') return;
    if (!ev.citations.find(c => c.sourceId === dragSourceData.sourceId)) {
      ev.citations.push({ id: newId(), sourceId: dragSourceData.sourceId, overrides: {} });
      renderPersonList(); renderPreview();
    }
  });

  const header = document.createElement('div');
  header.className = 'event-header';
  header.innerHTML = '<span class="event-tag">' + escHtml(ev.tag) + '</span>' +
    '<span class="event-label">' + escHtml(ev.label) + '</span>' +
    '<button class="btn-icon btn-remove-event" title="Ereignis entfernen">&#10005;</button>';
  header.querySelector('.btn-remove-event').addEventListener('click', () => {
    person.events = person.events.filter(e => e.id !== ev.id);
    renderPersonList(); renderPreview();
  });
  block.appendChild(header);

  if (ev.tag === 'EVEN') {
    const typeRow = document.createElement('div');
    typeRow.className = 'event-type-row';
    typeRow.innerHTML = '<label>Ereignistyp: <input class="event-type-input" value="' + escHtml(ev.customType) + '" placeholder="z.B. Schuleintritt" /></label>';
    typeRow.querySelector('input').addEventListener('input', e => { ev.customType = e.target.value; renderPreview(); });
    block.appendChild(typeRow);
  }

  ev.fields.forEach(field => block.appendChild(renderField(field, person, ev)));
  block.appendChild(createAddButton('+ Feld', GEDCOM_EVENT_FIELDS.map(f => ({path: f.path, label: f.label})), path => {
    addEventField(ev, path); renderPersonList(); renderPreview();
  }, true));

  // Citations
  const citBlock = document.createElement('div');
  citBlock.className = 'event-citations-block';
  const autoCits = sourceDefs.filter(s => s.attachTo.events);
  const manualCits = ev.citations.filter(c => !autoCits.find(s => s.id === c.sourceId));
  if (autoCits.length > 0 || manualCits.length > 0) {
    const citTitle = document.createElement('div');
    citTitle.className = 'event-citations-title';
    citTitle.textContent = 'Zitationen';
    citBlock.appendChild(citTitle);
  }
  autoCits.forEach(src => citBlock.appendChild(renderCitationRow(src, ev, ev.citations.find(c => c.sourceId === src.id), true)));
  manualCits.forEach(cit => {
    const src = sourceDefs.find(s => s.id === cit.sourceId);
    if (src) citBlock.appendChild(renderCitationRow(src, ev, cit, false));
  });
  if (autoCits.length === 0 && manualCits.length === 0) {
    const dropHint = document.createElement('div');
    dropHint.className = 'event-drop-source-hint';
    dropHint.textContent = 'Quelle aus linker Palette hierher ziehen';
    citBlock.appendChild(dropHint);
  }
  block.appendChild(citBlock);
  return block;
}

// ---- Render one citation row ----
function renderCitationRow(src, ev, manualCit, isAuto) {
  const row = document.createElement('div');
  row.className = 'citation-row' + (isAuto ? ' citation-auto' : ' citation-manual');
  row.innerHTML = '<div class="cit-header">' +
    (isAuto
      ? '<span class="cit-badge cit-auto" title="Automatisch angehaengt">auto</span>'
      : '<span class="cit-badge cit-manual" title="Manuell hinzugefuegt">manuell</span>') +
    '<span class="cit-name">' + escHtml(src.name) + '</span>' +
    (!isAuto ? '<button class="btn-icon cit-remove" title="Zitation entfernen">&#10005;</button>' : '') +
    '</div>';
  if (!isAuto && ev) {
    row.querySelector('.cit-remove').addEventListener('click', () => {
      ev.citations = ev.citations.filter(c => c.id !== manualCit.id);
      renderPersonList(); renderPreview();
    });
  }
  const fieldsList = document.createElement('div');
  fieldsList.className = 'cit-fields';
  const dataRow = getFirstDataRow();
  src.citationFields.forEach(f => {
    const v = previewSourceField(f, dataRow);
    if (!v) return;
    const fRow = document.createElement('div');
    fRow.className = 'cit-field-row';
    fRow.innerHTML = '<span class="cit-field-tag">' + escHtml(f.tag) + '</span><span class="cit-field-val">' + escHtml(v) + '</span>';
    fieldsList.appendChild(fRow);
  });
  row.appendChild(fieldsList);
  return row;
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
    const givn = person.fields.find(f => f.path === 'NAME.GIVN');
    const surn = person.fields.find(f => f.path === 'NAME.SURN');
    const nameStr = [
      givn ? previewFieldValue(givn, dataRow, gvars) : '',
      surn ? previewFieldValue(surn, dataRow, gvars) : ''
    ].filter(Boolean).join(' ') || person.label;
    title.textContent = nameStr;
    section.appendChild(title);
    person.fields.forEach(field => {
      const pv = previewFieldValue(field, dataRow, gvars);
      if (!pv) return;
      const row = document.createElement('div');
      row.className = 'preview-row';
      row.innerHTML = '<span class="preview-key">' + escHtml(field.label) + '</span><span class="preview-val">' + escHtml(pv) + '</span>';
      section.appendChild(row);
    });
    person.events.forEach(ev => {
      const evBlock = document.createElement('div');
      evBlock.className = 'preview-event';
      const evLabel = ev.tag === 'EVEN' && ev.customType ? ev.customType : ev.label;
      evBlock.innerHTML = '<div class="preview-event-title">' + escHtml(evLabel) + '</div>';
      ev.fields.forEach(field => {
        const pv = previewFieldValue(field, dataRow, gvars);
        if (!pv) return;
        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = '<span class="preview-key">' + escHtml(field.label) + '</span><span class="preview-val">' + escHtml(pv) + '</span>';
        evBlock.appendChild(row);
      });
      section.appendChild(evBlock);
    });
    if (person.relatives.length > 0) {
      const relBlock = document.createElement('div');
      relBlock.className = 'preview-event';
      relBlock.innerHTML = '<div class="preview-event-title">Verwandte</div>';
      person.relatives.forEach(rel => {
        const relTarget = mappingPersons.find(p => p.id === rel.targetPersonId);
        const row = document.createElement('div');
        row.className = 'preview-row';
        row.innerHTML = '<span class="preview-key">' + escHtml(rel.role) + '</span><span class="preview-val">' + escHtml(relTarget ? relTarget.label : '?') + '</span>';
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
    opt.textContent = 'Zeile ' + (i + 1) + ': ' + (preview || '(leer)');
    sel.appendChild(opt);
  });
  sel.addEventListener('change', renderPreview);
}
