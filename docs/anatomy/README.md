# Anatomie: Knochen

Einstieg: `/anatomie/` oder `anatomie/index.html`. Die Seite ist über die
Academy-Kursübersicht und den gemeinsamen Umschalter erreichbar. Alle Skripte
und 3D-Komponenten werden lokal ausgeliefert; ein Server oder Build ist zum
Lernen nicht erforderlich.

## Lernmodi

- **Freies Abfragen:** Erst selbst den Namen überlegen, dann einen Knochen
  anklicken. Name und Fachbegriff werden aufgedeckt. „Gewusst“ blendet das
  Lernziel aus; „Noch nicht gewusst“ lässt es für einen neuen Versuch sichtbar.
- **Knochen finden:** Der Name ist vorgegeben, die entsprechende Geometrie
  muss angeklickt werden. Eine falsche Antwort zeigt die gesuchte Stelle grün
  und den angeklickten Knochen rot. Nach „Weiter“ wird das verfehlte Lernziel
  am Ende der Runde erneut abgefragt.
- **Auf Zeit:** Freies Abfragen mit Stoppuhr. Die Uhr startet erst beim Start,
  läuft bei einem Tabwechsel weiter und stoppt beim letzten gewussten Lernziel
  oder beim vorzeitigen Auswerten. Nur vollständige Runden zählen für die
  persönliche Bestenliste. Sortierung: Erstversuch-Genauigkeit absteigend,
  dann Dauer aufsteigend; jede Region hat ihre eigene Wertung. Eine spätere
  Wiederholung korrigiert keinen verfehlten Erstversuch.

Alle Modi funktionieren am ganzen Skelett oder in fünf Regionen: Kopf,
Wirbelsäule, Brustkorb, Schulter/Arme/Hände und Becken/Beine/Füße. Der Atlas
zeigt Namen, Fachbegriffe und kurze Lagehinweise ohne Wertung.

## Umfang und Quellen

Das importierte Modell stammt aus **Écorché / BodyParts3D** und enthält
**198 benannte Knochen-Meshes**, zusammengefasst zu **88 Lernzielen**.
Die Original-Geometriebuffer des Downloads werden unverändert übernommen.
Die 24 freien Wirbel und 24 Rippen sind einzeln auswählbar. Teile des Schädels,
die Handwurzel-, Mittelhand-, Finger-, Fußwurzel-, Mittelfuß- und Zehenknochen
werden als ausdrücklich benannte Gruppen abgefragt. Es handelt sich daher
nicht um 206 einzeln geprüfte Knochen. Seitenangaben beziehen sich auf die
anatomische Person, nicht auf die Bildschirmseite.

Inhaltliche Referenzen: [OpenStax, Anatomy & Physiology 2e](https://openstax.org/details/books/anatomy-and-physiology-2e),
Kapitel 7–8. Einzelne Kapitel sind im Quellenbereich der Seite verlinkt.
Die fachärztliche Prüfung steht aus. Herkunft und vollständige Modell-Lizenz:
[Modellnachweis](../../assets/media/anatomy/ATTRIBUTION.md), **CC BY-SA 4.0**.
Der Quelldatensatz enthält kein separates Steißbein, Zungenbein, keine
Gehörknöchelchen und keine Dreiecksbeine. Diese werden nicht künstlich ergänzt
und nicht als separate Quizziele angeboten.

`scripts/import-anatomy.py` extrahiert ausschließlich vorhandene Quellmeshes,
prüft den gepinnten SHA-256-Hash, ordnet Namen zu Lernzielen zu und übernimmt
die Vertex- und Indexbuffer bytegleich. Die Szenenskalierung und Verschiebung
ändern nur die Darstellungseinheiten. Grenzen und Positionen aller Lernziele
werden aus den Originalmeshes abgeleitet.

Three.js **0.160.1 / r160** liegt unter `assets/js/vendor/three.min.js` und
wird ausschließlich auf der Anatomieseite geladen. Lizenz: MIT,
[`THREE-LICENSE.txt`](../../assets/js/vendor/THREE-LICENSE.txt).
Der lokale GLTFLoader verwendet dieselbe Three.js-Instanz. Über HTTP wird
`assets/media/anatomy/skeleton.glb` geladen; direkt geöffnete `file://`-Seiten
verwenden dieselben GLB-Bytes aus `skeleton-data.js`. Beide Dateien sind lokal
gebündelt, ohne externe Modellabfragen. Ein fehlgeschlagener Import zeigt einen
Ladefehler mit Wiederholen-Schaltfläche und startet keine Trainingsuhr.

## Bedienung und Speicherung

Ziehen dreht das Modell; Mausrad, Zwei-Finger-Geste und Plus/Minus zoomen.
Ansichtstasten zeigen Vorder-, Rück- und Seitenansicht. Die fokussierbare
Zeichenfläche unterstützt Pfeiltasten, Plus/Minus und Home. Zusätzlich steht
eine nummerierte Tastaturliste zur Verfügung; beim Fokussieren leuchtet das
Lernziel am Modell auf. Im Training enthält diese Liste keine Lösungsnamen.
Ohne WebGL erscheint eine anklickbare 2D-Frontprojektion derselben importierten
Dreiecksmeshes. Es werden keine Ersatzknochen aus Grundformen erzeugt.

Der letzte Wissensstand und maximal 200 Runden liegen unter
`resqly-anatomy-v1` im `localStorage`. Die Bestenliste zeigt die besten 20
vollständigen Zeitrunden der ausgewählten Region. Es gibt keine globale
Wertung und keinen Kontosync für Anatomie. Bei gesperrtem Speicher bleibt
das Training für die Dauer des Besuchs funktionsfähig. Laufende Runden werden
beim Neuladen verworfen und nicht als fertige Bestzeit gespeichert.

## Dateikarte und Prüfung

- `assets/js/anatomy/content.js`: Lernziele, Regionen und Quellen.
- `assets/js/anatomy/core.js`: Zustandsübergänge, Erstversuche, Zeit und Rangfolge.
- `assets/js/anatomy/model.js`: GLB-Import, Raycasting, Ansicht und Ressourcenfreigabe.
- `assets/js/anatomy/asset-manifest.js`: Herkunft, Prüfsummen, Quellnamen und Originalgrenzen.
- `assets/media/anatomy/`: Importiertes Modell, lokale Dateivorschau und Lizenznachweise.
- `assets/js/anatomy/app.js`, `assets/css/anatomy.css`: Oberfläche.
- `tests/anatomy.test.cjs`: Daten, Wertung, Wiederholungen und Speicherprüfung.
- `tests/anatomy.spec.cjs`: Desktop/Mobil, echte Modellklicks, Kursnavigation,
  Lernrunden, Bestenliste, lokaler Einstieg und WebGL-/Speicherersatz.

`npm test`, `npm run test:browser`, `python3 -m unittest discover -s tests -v`
und `npm run build` prüfen das Projekt. Der statische Build enthält den Ordner
`anatomie/` und das lokal gebündelte Three.js.
