# Resqly Academy

Interaktive Kurse für EKG, Röntgen und Anatomie auf Deutsch — aufgebaut wie eine
Sprachlern-App: kurze Lektionen, ein Lernpfad mit Freischaltung, Herzen, XP und Streak.

## Anatomie: Knochen in 3D

Neu unter **`/anatomie/`** oder `anatomie/index.html`: ein dreh- und zoombares,
anatomisches 3D-Skelett aus Écorché / BodyParts3D mit 198 benannten Knochen-Meshes
und 88 Lernzielen. Die importierten Knochenformen werden unverändert verwendet.
Freies Abfragen mit Selbsteinschätzung und ausblendbaren gewussten Knochen,
Namen-zu-Knochen-Training mit Fehlerwiederholung und ein Zeitmodus mit
persönlicher Bestenliste. Alle Modi lassen sich am ganzen Skelett oder in fünf
Körperregionen üben. Dazu ein Knochenatlas mit deutschen und anatomischen Namen.

Fortschritt und Bestenliste bleiben lokal in diesem Browser. Three.js und
das importierte Modell sind lokal gebündelt; es werden keine externen 3D-Dienste benötigt.
Kleine Knochen sind teilweise gruppiert; es werden nicht alle 206 Knochen
einzeln geprüft. [Bedienung, Umfang, Quellen und Dateikarte](docs/anatomy/README.md).

## Starten

`ekg/index.html` im Browser öffnen (oder `index.html`, die Kursübersicht der
Resqly Academy). Es gibt keinen Build-Schritt und keine Abhängigkeiten — reines
HTML, CSS und JavaScript. Ohne Anmeldung bleibt der Fortschritt im Browser.
Mit einem Konto synchronisiert der Server Academy, EKG und Röntgen über dieselbe
SQLite-Datenbank. Der lokale Fortschritt wird bei der ersten Anmeldung übernommen.

## Röntgen by Resqly

`http://localhost:8000/roentgen/` oder `roentgen/index.html` direkt öffnen.
Röntgen ersetzt Sono in der Kursübersicht und im gemeinsamen Umschalter.

- Jede Lektion beginnt mit einer Erklärungsseite: Begriffe, Bildmerkmale und
  Einordnung der anschließend geprüften Inhalte, einschließlich des Colles-Musters.
- Vier Einheiten mit zwölf kurzen Lektionen und 37 Übungen: Bilder zuordnen,
  systematisch durchmustern, Normalbild erkennen, Frakturen lokalisieren und
  beschreiben, Begleitverletzungen und Aussagegrenzen beachten.
- Fünf lokal gebündelte Originalaufnahmen aus vier Untersuchungen (Handgelenk,
  Klavikula, Unterschenkel), mit Zoom, Kontrast und freiem Anklicken gesuchter Bildstellen.
- Derselbe Lernstil wie EKG: Lernpfad mit Freischaltung, fünf Herzen pro Runde,
  sofortige Erklärungen, Fehlerwiederholung, 10 XP plus 5 XP für fehlerfreie
  Runden und tägliche Serie. Fünf Fehler beenden den Versuch ohne Freischaltung.
- Trainer mit gemischten Aufgaben aus freigeschalteten Lektionen und gezielter
  Fehlerwiederholung; Bildatlas und Checkliste mit Quellen.
- Fortschritt lokal unter `roentgen-learning-v1`; mit Konto synchronisiert über
  `/api/progress/roentgen`. Alte Sono-Kontodaten bleiben erhalten.

Dateien: `assets/js/roentgen/{content,core,app}.js`,
`assets/css/roentgen.css`, `roentgen/index.html`.
[Medienherkunft und Lizenzen](docs/media/ROENTGEN.md).
Die Inhalte sind quellenbasiert, die fachärztliche Prüfung steht aus.

## Konto und gemeinsamer Lernstand

`python3 server.py` startet auch die Konto-API. Die Datenbank liegt lokal unter
`data/academy.sqlite3`; im systemd-Dienst unter
`/var/lib/resqly-academy/academy.sqlite3` (ältere Installationen: `/var/lib/ekg-lernen/`). Über `RESQLY_DB_PATH` kann der Pfad
geändert werden. Diese Datei muss dauerhaft gespeichert und gesichert werden.
Alle Kursdomains müssen auf denselben Backend-Dienst zeigen. Die Sitzungscookie
gilt auf `*.resqly.lu`, sodass ein
Konto auf Academy, EKG und Röntgen verwendet werden kann.

API für spätere App-Anbindung (JSON):

| Methode | Pfad | Zweck |
|---|---|---|
| `POST` | `/api/account/register` | Konto mit `email` und `password` erstellen |
| `POST` | `/api/account/login` | Anmelden |
| `POST` | `/api/account/logout` | Sitzung beenden |
| `GET` | `/api/account/me` | Angemeldetes Konto lesen |
| `GET` | `/api/progress` | Lernstand aller Fachgebiete lesen |
| `GET`, `PUT` | `/api/progress/{academy,ekg,roentgen}` | Lernstand eines Fachgebiets lesen oder speichern |
| `GET`, `PUT` | `/api/progress/profile` | Gemeinsame Academy-Wertung: XP je Kurs und Lerntage (Level, Serie, Tagesziel) |

Browser verwenden eine HttpOnly-Sitzungscookie. Native Apps können beim
Registrieren oder Anmelden `"client":"native"` senden und erhalten dann ein
Token für `Authorization: Bearer <token>`. Ein Login per E-Mail und Passwort
ist vorhanden; Passwortzurücksetzung und E-Mail-Bestätigung sind noch nicht
implementiert.

## Challenge im Kurs (App und Browser, mehrere Geräte)

Die Flutter-App in `../flutter_app` verwendet dieselben Lobbys wie die Website.
Der Host kann die App oder den Browser verwenden; alle anderen treten mit
demselben vierstelligen Code bei. Alle Geräte müssen denselben
**Challenge-Server** verwenden (öffentlich: `https://ekg.resqly.lu/`).
Die Adresse lässt sich im Challenge-Einstieg auf beiden Plattformen einstellen.
Im Browser bleibt die Auswahl ohne Eingabe automatisch: erst der Server dieser
Seite, danach der öffentliche Kursserver. App-Neustarts und das Neuladen
derselben Browser-Registerkarte stellen die eigene Sitzung wieder her.

Challenge und Kontosynchronisierung verwenden denselben `server.py`-Dienst —
reine Standardbibliothek, nichts zu installieren:

```bash
python3 server.py
```

### Auf dem öffentlichen Kursserver

Läuft die Seite bereits auf einem Server, ist nichts weiter zu tun — alle
öffnen dieselbe Adresse:

```
https://ekg.resqly.lu/
```

Unter dieser Adresse öffnet sich direkt die Challenge (`QUIZ_HOST` in
`assets/js/app.js`); alle anderen Bereiche sind über die Navigation erreichbar.

Wer die Dateien stattdessen direkt aus dem Ordner öffnet, kann trotzdem
mitspielen: Die Challenge greift dann automatisch auf denselben Kursserver zu.
Die Adresse steht in `assets/js/app.js` unter `CHALLENGE_SERVER` — beim Umzug
ist das die einzige Zeile, die sich ändert.

### Im eigenen Netz, ohne Internet

Der Server nennt beim Start zwei Adressen. Die zweite (`http://192.168.…`)
geben alle Mitspielenden im selben WLAN in ihrem Browser ein. Dann:

1. Eine Person geht auf **Trainer → Challenge** und eröffnet eine Lobby.
2. Der vierstellige Code erscheint groß auf dem Bildschirm.
3. Alle anderen tippen Namen und Code ein und treten bei.
4. Der Host legt Umfang (5–30 EKGs), Zeit pro Frage und Themengebiet fest
   und startet.

App-Spieler tragen die zweite Adresse unter **Trainer → Challenge →
Challenge-Server** ein. Der Lobbycode und die URL werden in der Lobby angezeigt.
Bei HTTPS muss auch der Challenge-Server HTTPS verwenden. Im eigenen WLAN
die HTTP-Seite direkt vom lokalen Server öffnen. iOS/macOS benötigen die
Freigabe für das lokale Netzwerk.

Gespielt wird wie bei Kahoot: Für jede richtige Antwort gibt es bis zu 1000
Punkte — die Hälfte ist sicher, die andere Hälfte schmilzt mit der verbrauchten
Zeit weg. Jeder weitere Treffer in Folge bringt 100 Punkte Zuschlag, höchstens
500. Eine falsche oder fehlende Antwort reißt die Serie ab, die Punkte bleiben.

Sobald alle geantwortet haben oder die Zeit abgelaufen ist, kommt die Auflösung:
richtige Antwort, eigene Punkte, Zuspruch zur Serie („Serie von 3 — voll im
Flow!"), die Verteilung der Gruppe und der Zwischenstand. Nach sieben Sekunden
geht es von selbst weiter. Am Ende stehen Podium, Endstand und die Auflösung
aller EKGs.

Die Lobbys liegen nur im Arbeitsspeicher; ein Neustart des Servers löscht sie.
Das gilt nur für die Challenge. Konten und Lernstände bleiben in SQLite erhalten.
Anderer Port: `PORT=9000 python3 server.py`.

**Alle Kurse laufen weiterhin ohne Server**, direkt aus dem Ordner. In diesem
Fall bleibt der Lernstand lokal und die Kontoanzeige wird ausgeblendet.

## Auf dem Server ausrollen

Einmalig auf dem Ubuntu-Server:

```bash
git clone https://github.com/matti377/Resqly-Academy.git
cd Resqly-Academy
./deploy.sh
```

Danach reicht bei jeder Änderung wieder `./deploy.sh`. Das Skript holt den
Stand, richtet einen systemd-Dienst ein (oder frischt ihn auf), startet neu und
prüft, ob die Seite auch wirklich antwortet.

| Aufruf | Wirkung |
|---|---|
| `./deploy.sh` | Stand holen, Dienst einrichten/neu starten, prüfen |
| `./deploy.sh --status` | Nachsehen, was gerade läuft |
| `./deploy.sh --logs` | Log mitlesen |
| `./deploy.sh --no-pull` | Lokalen Stand ausrollen, ohne zu holen |
| `./deploy.sh --force` | Auch neu starten, wenn eine Challenge läuft |

Einstellungen kommen aus `deploy.env` neben dem Skript (nicht im Repository):

```bash
PORT=8000
SERVICE=resqly-academy
RUN_USER=ekg
```

### Hinter nginx (ekg.resqly.lu)

In `deploy.env` `HOST=127.0.0.1` setzen, damit `server.py` nur noch über den
Proxy erreichbar ist, und `./deploy.sh` erneut ausführen. Dann in nginx:

```nginx
server {
    server_name ekg.resqly.lu;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

HTTPS danach mit `sudo certbot --nginx -d ekg.resqly.lu`.

Zwei Dinge, die das Skript bewusst tut:

- **Es baut das PDF nicht neu.** Das fertige `EKG-Skript.pdf` liegt im
  Repository. Würde der Server es neu erzeugen, wäre der Arbeitsbereich
  verändert und der nächste `git pull --ff-only` blockiert. Gebaut wird lokal,
  eingecheckt wird das Ergebnis.
- **Es fragt nach, wenn gerade eine Challenge läuft.** Die Lobbys liegen nur im
  Arbeitsspeicher; ein Neustart mitten im Kurs würde alle hinauswerfen.

Auf dem Server sind **keine Python-Pakete nötig** — `server.py` kommt mit der
Standardbibliothek aus. `reportlab` braucht nur, wer das PDF baut.

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Resqly Academy: Startseite mit Links zu den Kursordnern |
| `ekg/index.html` | Grundgerüst, Kopfzeile, Navigation des EKG-Kurses |
| `assets/css/style.css` | Designsystem (Farben, Buttons, Lernpfad, Aufgaben) |
| `assets/js/ekg.js` | Signalerzeugung und Canvas-Darstellung der EKG-Kurven |
| `assets/js/heart.js` | Schematisches Herz mit animiertem Erregungsleitungssystem |
| `assets/js/content.js` | Sämtliche Lektionen, Aufgaben und Bibliothekstexte |
| `assets/js/ui.js` | Aufgabentypen, Medien-Bausteine, Töne |
| `assets/js/app.js` | Zustand, Navigation und die einzelnen Bildschirme |
| `assets/js/challenge.js` | REST-Verbindung, Zeitlimit und Serverprüfung für die gemeinsame App/Web-Challenge |
| `EKG-Skript.pdf` | Begleitskript zum Verteilen (26 Seiten, A4) |
| `build_pdf.py`, `ekgdraw.py` | Erzeugen das PDF; Schriften in `skript-fonts/` |
| `server.py` | Nur für die Challenge: liefert die Seite aus und verwaltet die Lobbys |
| `deploy.sh` | Ausrollen auf dem Ubuntu-Server (siehe oben) |
| `KORREKTUREN.md` | Was gegenüber der Vorlage `ECG ++.docx` geändert wurde |

Die Skripte hängen an `<script>`-Tags mit Versionsnummern. Nach einer Änderung diese
Zahl erhöhen, damit der Browser nicht die alte Datei aus dem Cache nimmt.

### Multiplayer prüfen

```bash
python3 -m unittest discover -s tests -v
cd ../flutter_app
flutter analyze
flutter test
```

Der Integrationstest benötigt zusätzlich Node.js. Er startet einen lokalen
Python-Server und spielt echte App/Web-Lobbys bis zum Endstand durch — einmal
mit der App und einmal mit dem Browser-Protokoll als Host.

## Das PDF neu bauen

```bash
python3 build_pdf.py EKG-Skript.pdf
```

Braucht `reportlab` (`pip3 install --user reportlab`). Sämtliche EKG-Kurven im
PDF werden aus demselben Wellenmodell berechnet wie die auf der Website —
`ekgdraw.py` ist die Portierung von `ekg.js` nach Python. Ändert sich also eine
Kurvenform, muss sie an beiden Stellen angepasst werden.

## Die Bereiche

- **Lernpfad** — Lektionen in 8 Einheiten, von den Grundlagen bis zur
  interaktiven Medikamentengabe. Jede Lektion mischt Lehrfolien und Übungen.
- **Befunde** — Nachschlagewerk mit 35 laufenden Rhythmusstreifen, nach
  Kategorie filterbar.
- **Labor** — Frequenz, PQ-Zeit, QRS-Breite, ST-Strecke sowie P- und T-Welle
  frei einstellen; die Auswertung darunter benennt die Befunde automatisch.
- **Trainer** — zwei Modi:
  - *Einzeltraining:* EKG ansehen, Befund ins Suchfeld tippen, aus der
    Vorschlagsliste wählen. Kurzformen wie `VHF`, `VT` oder `RSB` funktionieren;
    nach Gruppen filterbar. Bei mehrdeutiger Eingabe (etwa „Mobitz") verlangt
    das Feld bewusst eine Auswahl, statt zu raten.
  - *Challenge:* Mehrspieler-Quiz mit Punkten, Serien und Podium — siehe oben.
    Braucht `server.py`.
- **Ableitungen** — Cabrera-Kreis der Frontalebene, Brustwandableitungen und
  die Zuordnung Infarktlokalisation → Gefäß.

## Wie die Kurven entstehen

Jede Kurve wird gerechnet, nicht aufgezeichnet. Wellen sind Gauß-Funktionen
mit Lage, Breite und Amplitude in Sekunden bzw. Millivolt (`V_DEFAULT` in
`ekg.js`). Vorhof- und Kammeraktionen werden **getrennt** eingeplant — genau
deshalb lassen sich AV-Blöcke und die AV-Dissoziation beim totalen Block
sauber abbilden.

Neuen Rhythmus ergänzen: einen Eintrag in `GEN` anlegen und die ID in
`LIBRARY` (`content.js`) eintragen.

```js
mein_rhythmus: sinusLike({
  rate: 70, pq: 0.16,
  vTpl: { t: { a: -0.4 } }        // negative T-Welle
})
```

## Aufgabentypen

`mc` (Einfachauswahl) · `rhythm` (Streifen erkennen) · `tf` (richtig/falsch) ·
`multi` (Mehrfachauswahl) · `order` (Reihenfolge) · `match` (Zuordnen) ·
`num` (Zahleneingabe mit Toleranz) · `medication` (Dosis eingeben, geben und
EKG-Wirkung sehen) · `label` (auf die Kurve tippen) ·
`teach` (Lehrfolie, keine Wertung)

## Hinweis

Das Material dient dem Lernen und ersetzt keine medizinische Ausbildung,
keine Leitlinie und keine ärztliche Beurteilung. Die Kurven sind
mathematisch erzeugt und damit idealisiert — ein echtes Patienten-EKG ist
unruhiger und vielgestaltiger.

## Archivierter SONO-Kurs (ausgeblendet)

Der bisherige SONO-Code bleibt zur Aufbewahrung vorhandener Lernstände im
Repository. SONO ist vollständig aus Kursübersicht und Umschalter entfernt;
der Einstieg `sono/index.html` leitet zur Academy zurück. Die folgenden
Angaben dokumentieren den archivierten Kurs.

```bash
python3 server.py
# EKG:  http://localhost:8000/ekg/
# SONO: http://localhost:8000/sono/
```

SONO zeigt sechs Module mit 73 kurzen Lektionen im EKG-Lernpfad. Jede Lektion
hat eine Erklärungsseite, ein Beispiel und eine kleine Übung. Wo ein passender
Originalclip vorhanden ist, erscheint er auf der Beispielseite. Der Fortschritt
bleibt ohne Anmeldung lokal und wird nach Anmeldung im gemeinsamen Konto
gespeichert. Die klinische Prüfung der Inhalte erfolgt vor Veröffentlichung
durch den Betreiber.

Medienherkunft, Lizenz und Bearbeitung: [Mediennachweis](docs/media/README.md).
Für intraabdominelle eFAST-Aufnahmen fehlt weiterhin ein Originalclip.

- [Architektur, Dateikarte und Erweiterung](docs/SONO_ARCHITECTURE.md)
- [Lokaler Start, Tests, Build und Domainkonfiguration](docs/SONO_DEPLOYMENT.md)
- [Medizinische Prüfaufgaben und fehlende Aufnahmen](MEDICAL_REVIEW.md)

## Resqly Academy — gemeinsame Startseite

Die Startseite (`index.html`, gedacht für `academy.resqly.lu`) ist die
Kursübersicht im selben Design. Jedes Fachgebiet hat einen eigenen Ordner mit
eigener `index.html`:

```
index.html        Resqly Academy     http://localhost:8000/
ekg/index.html    EKG-Kurs           http://localhost:8000/ekg/
roentgen/index.html Röntgen-Kurs     http://localhost:8000/roentgen/
assets/           gemeinsames Design, Skripte und Medien aller Kurse
```

Neben den Kurslinks bietet die Startseite das **Quiz des Tages** und das
**Themen-Quiz** (siehe unten). Die
bisherigen Adressen funktionieren weiter: `ekg.resqly.lu/` und
`roentgen.resqly.lu/` (bei konfigurierter Domain) sowie alte EKG-Links werden im
Browser in den passenden Ordner weitergeleitet. Röntgen funktioniert auch auf
der bestehenden Domain unter `/roentgen/`, ohne zusätzliche DNS-Konfiguration.
Alte SONO-Einstiege führen zur Academy zurück.

Domain, TLS und Proxy richtet der Betreiber wie bei SONO ein, siehe
[Domainkonfiguration](docs/SONO_DEPLOYMENT.md#academy-startseite-und-kursordner).

### Quiz des Tages, Themen-Quiz und die Fragen-CSV

- **Quiz des Tages** (`/#/tagesquiz`): jeden Tag fünf Fragen zu genau einem
  Thema, für alle dieselben. Die Themen laufen in der Reihenfolge der CSV durch;
  eine Frage kommt erst wieder, wenn alle Fünferblöcke ihres Themas dran waren.
  Das erste Ergebnis des Tages zählt, daraus entsteht die Serie (🔥).
- **Themen-Quiz** (`/#/themen`): Runden mit zehn Fragen pro Thema — zuerst
  neue Fragen, dann die zuletzt falsch beantworteten.
- **Wissens-Score**: Anteil der Fragen, deren letzte Antwort richtig war.

Ohne Anmeldung liegen Serie und Score im `localStorage` des Browsers
(`resqly-academy-v1`). Mit Anmeldung werden sie im gemeinsamen Konto
gespeichert. Die Fragen werden per `fetch`
geladen; beide Quizformen brauchen deshalb `python3 server.py` (oder einen
anderen Webserver) und laufen nicht aus einer direkt geöffneten Datei.

Alle Fragen stehen in **`assets/data/fragen.csv`** (UTF-8, eine Zeile pro
Frage, immer drei Antworten und genau eine richtige):

| Spalte | Inhalt |
|---|---|
| `id` | eindeutig und dauerhaft, z. B. `EKG-042` — daran hängt der Lernstand |
| `fach` | Fachgebiet, derzeit nur `EKG` |
| `thema` | Thema; alle Fragen mit demselben Text bilden ein Thema |
| `schwierigkeit` | `1` (Grundwissen) bis `3` (Vertiefung) |
| `frage` | Fragetext, reiner Text ohne HTML |
| `antwort_a`, `antwort_b`, `antwort_c` | die drei Antworten; angezeigt werden sie gemischt |
| `richtig` | `A`, `B` oder `C` |
| `erklaerung` | Begründung, erscheint nach der Antwort |

Neue Fragen einfach als Zeilen anhängen; ein neues `thema` oder `fach`
erscheint von selbst. Ein Thema braucht mindestens fünf Fragen, um als Quiz des
Tages dranzukommen. Die Datei darf auch mit Semikolon als Trennzeichen
gespeichert werden (deutsches Excel). Fehlerhafte Zeilen werden übersprungen
und in der Browserkonsole gemeldet; `npm run validate:medical` und `npm test`
prüfen die Datei vollständig.

Die derzeit 320 EKG-Fragen in 16 Themen sind an die Grenzwerte des EKG-Kurses
und an ESC-/ERC-Leitlinien angelehnt, aber **nicht fachärztlich geprüft** —
vor einer Veröffentlichung gilt dasselbe wie für die Kursinhalte.

Die Laufzeit bleibt Vanilla-JavaScript ohne neue Backend-Abhängigkeiten.
Node/Playwright sind optionale Entwicklungswerkzeuge (`npm ci`, `npm test`,
`npm run test:browser`, `npm run build`). Der bestehende Deploymentablauf
bleibt erhalten; DNS/Proxy/TLS müssen durch den Betreiber ergänzt werden.
