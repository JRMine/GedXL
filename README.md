# GedXL

**GedXL** ist ein webbasiertes Tool zur Konvertierung von tabellarischen genealogischen Daten (Excel/CSV) in GEDCOM-Dateien.

> ⚠️ Projekt in Entwicklung — noch nicht veröffentlicht.

## Überblick

- **Plattform:** Webapp, läuft vollständig im Browser (kein Backend, kein Server nötig)
- **Verarbeitung:** Dateien bleiben lokal im Browser → datenschutzfreundlich
- **Geplante Veröffentlichung:** wiki.genealogy.net/GedXL (Verein für Computergenealogie)

---

## Funktionsweise — 6 Schritte

### Schritt 1 — Upload
Excel (.xlsx) oder CSV hochladen. Wird im Browser geparst (SheetJS), nichts wird an einen Server geschickt. Alle Tabellenblätter werden erkannt.

### Schritt 2 — Import-Check *(vor dem Mapping)*
Jede Zeile wird klassifiziert:

| Typ | Beispiel |
|-----|---------|
| **Datenzeile** | normaler Datensatz |
| **Header** | Spaltenbezeichnungen |
| **Zwischenüberschrift** | z.B. `1702` mitten in der Tabelle |
| **Globale Variable** | Wert der für alle nachfolgenden Zeilen gilt → z.B. `{Jahr}` |

Dazu: Spaltenanalyse mit Füllstand ("80% belegt").

### Schritt 3 — Mapping (Split-Dashboard)
- **Links:** Tabellenspalten mit Beispieldatensätzen + Füllstand
- **Rechts:** Zielstruktur wie im Genealogieprogramm — Personen und Ereignisse per `+` anlegen, Spalten per Drag & Drop zuordnen
- Mehrere Spalten kombinierbar, z.B. `{Tag}.{Monat}.{Jahr}` → gültiges GEDCOM-Datum
- Manuelle Ergänzungen möglich (statische Werte für alle Zeilen)
- Live-Vorschau der Personenkarte
- Eltern/Kinder/Partner händisch zuordenbar
- Mappings als **Profile speichern/laden** (JSON)

### Schritt 4 — Werte-Normalisierung
Wählbare Parser pro Feld (Datum, Ort, Name). Wenn ein Wert nicht erkannt wird (z.B. *"um Johannis 1782"*) → **"nicht normalisiert"-Marker** → Wert landet im GEDCOM `NOTE`-Feld statt verloren zu gehen.

### Schritt 5 — Quellenangaben (4 Modi)
| Modus | Wann |
|-------|------|
| Aus der Tabelle (Spalte mappen) | Quelle variiert je Zeile |
| Anderes Tabellenblatt | z.B. Sheet "Quelle und Bearbeiter" |
| **Statisch + Citations aus Spalte** ⭐ | Eine Quelle für alle, Seitenzahl je Zeile |
| Vorhandene Quell-ID | Verweis auf bestehendes GEDCOM |

### Schritt 6 — Export
- GEDCOM 5.5.1 (Standard) oder 7.0
- Live-Validierung vor Export: *"23 Zeilen ohne Namen"*, *"12 Datumsangaben nicht erkannt"*

---

## MVP (erste Ausbaustufe)

- [ ] Upload Excel/CSV
- [ ] Import-Check mit Zeilenklassifikation
- [ ] Split-Dashboard Mapping
- [ ] Globale Variablen aus Zwischenüberschriften
- [ ] Quelle: Statisch + Citations
- [ ] NOTE-Fallback für nicht normalisierbare Werte
- [ ] GEDCOM 5.5.1 Export
- [ ] Profile speichern/laden

## Spätere Ausbaustufen

- [ ] Beziehungs-Mapping (Eltern/Kind/Partner)
- [ ] Duplikaterkennung über mehrere Dateien
- [ ] GEDCOM 7.0

---

## Entwicklung

```bash
# Lokales Entwickeln — einfach index.html im Browser öffnen
# Kein Build-Schritt nötig für den MVP
```

## Lizenz

Wird noch festgelegt (voraussichtlich Open Source).
