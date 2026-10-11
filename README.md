# GedXL

**GedXL** ist ein webbasiertes Tool zur Konvertierung von tabellarischen genealogischen Daten (Excel/CSV) in GEDCOM-Dateien.

> ⚠️ Projekt in aktiver Entwicklung — Feedback willkommen!

## 🌐 Live-Demo

**https://jrmine.github.io/GedXL/**

Die App läuft vollständig im Browser — kein Login, keine Installation nötig.

---

## Überblick

- **Plattform:** Webapp, läuft vollständig im Browser (kein Backend, kein Server nötig)
- **Verarbeitung:** Dateien bleiben lokal im Browser → datenschutzfreundlich
- **Hauptrepo:** https://gitlab.genealogy.net/jasminriegler/gedxl *(Verein für Computergenealogie)*
- **Mirror + Pages:** https://github.com/JRMine/GedXL

---

## Funktionsweise — 6 Schritte

### Schritt 1 — Upload
Excel (.xlsx) oder CSV hochladen. Wird im Browser geparst (SheetJS), nichts wird an einen Server geschickt. Alle Tabellenblätter werden erkannt.

### Schritt 2 — Projekteinstellungen
GEDCOM-Version (5.5.1 oder 7.0), Zeichensatz, Sprache, Dateiname und Metadaten (Bearbeiter, Notiz) festlegen. Live Header-Vorschau.

### Schritt 3 — Import-Check
Jede Zeile wird klassifiziert:

| Typ | Beispiel |
|-----|---------|
| **Datenzeile** | normaler Datensatz |
| **Header** | Spaltenbezeichnungen |
| **Zwischenüberschrift** | z.B. `1702` mitten in der Tabelle |
| **Globale Variable** | Wert der für alle nachfolgenden Zeilen gilt → z.B. `{Jahr}` |

Dazu: Spaltenanalyse mit Füllstand ("80% belegt").

### Schritt 4 — Quellenangaben
Quellen per Drag & Drop konfigurieren. Felder können aus Tabellenspalten, globalen Variablen oder als feste Werte belegt werden. Automatische und manuelle Zitationen an Personen und Ereignissen.

### Schritt 5 — Mapping
- **Links:** verfügbare Tabellenspalten als Chips
- **Mitte:** Zielstruktur — Personen und Ereignisse anlegen, Spalten per Drag & Drop zuordnen (~100 GEDCOM-Felder, 35 Ereignistypen)
- Mehrere Personen pro Zeile möglich (z.B. Täufling + Vater + Mutter)
- Beziehungen (Eltern/Kind/Partner) verknüpfbar
- Live-Vorschau des generierten GEDCOM
- Mappings als **Profile speichern/laden** (JSON)

### Schritt 6 — Export
- GEDCOM 5.5.1 oder 7.0 herunterladen
- Datum-Prüfliste: historische Datumsangaben (z.B. *„um Johannis 1782"*) werden automatisch konvertiert, nicht erkannte als CSV exportierbar

---

## ⚠️ Bekannte Einschränkungen / noch nicht fertig

- **GEDCOM 7.0** — Grundstruktur vorhanden (kein CHAR-Tag, NOTE als eigene Records), aber noch nicht vollständig getestet und validiert
- **Quellenblätter** — separate Tabellenblätter als Quelldaten-Lookup noch nicht implementiert
- **Beziehungs-IDs** — Eltern/Kind/Partner-Links werden zwar erfasst, aber die FAM-Record-Generierung ist noch rudimentär
- **Duplikaterkennung** über mehrere Dateien fehlt noch

---

## Entwicklung

```powershell
# Lokales Entwickeln — einfach index.html im Browser öffnen
# Kein Build-Schritt nötig

# Änderungen pushen (beide Repos):
git add -A
git commit -m "Beschreibung"
git push origin master   # → GitLab (Vereinsrepo, Hauptrepo)
git push github master   # → GitHub (Live-Demo via GitHub Pages)
```

### Remotes einrichten (einmalig)
```powershell
git remote add origin https://gitlab.genealogy.net/jasminriegler/gedxl.git
git remote add github https://github.com/JRMine/GedXL.git
```

---

## Technologie

- Kein Build-Schritt, kein Framework — reines HTML/CSS/JavaScript
- [SheetJS](https://sheetjs.com/) via CDN für Excel-Parsing
- Historischer Datumsparser für kirchliche Feste, Qualifikatoren (ABT/BEF/AFT), Altstil, Doppeljahre

---

## Lizenz

Wird noch festgelegt (voraussichtlich Open Source).
