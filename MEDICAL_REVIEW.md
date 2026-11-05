# SONO: medizinische Prüfung vor Freigabe

Stand: **2026-10-08**. Status: **Awaiting medical review / Fachprüfung ausstehend**.
Es liegt keine medizinische Freigabe durch eine qualifizierte Person vor. `lastReviewed` und `reviewer` sind absichtlich `null`. Quellenzugriff, automatisierte Konsistenztests und Softwarefunktion dürfen nicht als ärztliche Prüfung dargestellt werden.

## Umfang und offene Aufgaben

| Bereich | Vorhanden | Ausstehende Fachprüfung |
|---|---|---|
| Grundlagen | 16 kurze Lektionen; Frequenz- und Orientierungsdiagramme | Physikformulierungen, geeignete Schallkopfwahl, Auflösung, Doppler und ALARA/TI/MI; keine Gerätesimulation |
| Lunge | 15 kurze Lektionen, Zeichen und Fälle | Kriterien für A-/B-Linien, lokaler Aussagewert von Sliding, Alternativen bei fehlendem Sliding, echte/pseudo Lung Points, Air Bronchogram, Erguss/Konsolidierung |
| eFAST | 12 kurze Lektionen, Untersuchungsfenster, Traumafall | Akquisition rechts/links/Becken/Perikard/Thorax, physiologische und vorbestehende Flüssigkeit, falsch positive/negative Befunde, klinischer Versorgungspfad |
| Herz | 12 kurze Lektionen | FoCUS-Grenzen, Standardansichten, Gerätemarker, Perikard versus Pleura/Fett, Tamponade, Volumenstatus, Rechtsherzbelastung; kein quantitatives Messtraining |
| Gefäße | 8 kurze Lektionen | Vollständigkeit von Kompressionsprotokollen, Doppler, Punktion, Nadelspitzensicht, Kontraindikationen, Hygiene und lokale Standards |
| Abdomen | 10 kurze Lektionen | Anatomische Orientierung, Normalvarianten und Limitationen; kein vollständiger organspezifischer Diagnostikkurs |
| Fälle / Fragen | 5 ausdrücklich fiktive Fälle, 16 Fragen mit Begründung jeder Option | Klinische Plausibilität der erfundenen Vitalwerte, Fragestellung, sichere Antwortoptionen und didaktische Eignung |
| Medieneinträge | 7 klinische Clips mit Postern, 5 Lehrdiagramme, 1 ausstehender eFAST-Clip | Medizinische Zuordnung, Qualität und didaktische Eignung; Rechte- und Bearbeitungsnachweise liegen vor |
| Simulator | 5 animierte Lehrdiagramme, Gain/Tiefe/Freeze, qualitative M-Mode-Muster, echte Referenzclips | Anatomische und didaktische Prüfung der Zeichnungen; Referenzclips sind nicht auf virtuelle Schallkopfpositionen kalibriert |

Die 73 Lektionen sind **kompakte Einführungsentwürfe**, jeweils mit Kernaussage, Lernziel, Aussagegrenze und Quellen. Sie bilden keinen vollständigen Fachkurs ab. Vertiefte Akquisitionsanleitungen, validiertes Bilderkennungstraining und zusätzliche diagnostische Differenzialfälle sind nach Fachprüfung zu ergänzen. Der tatsächliche Lehrwert der Fragen muss erprobt werden; keine Wirksamkeit wurde validiert.

## Quellenabgleich

Die konkreten ACEP-Sonoguide-Seiten zu Physik, Lunge, eFAST, Herz, Gefäßen, Gallenblase, Niere und Aorta sowie AIUM-ALARA wurden zur Recherche aufgerufen. Bibliografische Metadaten, Zugriffsdatum und Fundstellen liegen in `assets/js/sono/content.js`. Nicht verifizierte Publikationsdaten stehen ausdrücklich auf `null` und werden in der Oberfläche als offen dargestellt.

EFSUMB hat Vorrang im weiteren Leitlinienabgleich:

- [Leitlinienregister](https://efsumb.org/guidelines-recommendations-english-versions/) und [Trainingsempfehlungen](https://efsumb.org/minimum-training-recommendations/) wurden gelesen. Registerseiten sind keine Belege für einzelne diagnostische Schwellenwerte.
- [EFSUMB Physik-Kapitel](https://efsumb.org/wp-content/uploads/2026/02/ECB2ndCh1_Basic_principles_rv2026.pdf): Text zugänglich, DOI 10.37713/ECB01. Versionsdatum muss geklärt werden: Kopfdatum 2018, Dateipfad 2026. Keine neue Publikationsversion daraus erfinden.
- [EFSUMB PoCUS Part One](https://orca.cardiff.ac.uk/id/eprint/154484/): bibliografischer Eintrag und Abstract zugänglich, Online-Publikation 2022, DOI 10.1055/a-1882-5615. PDF-Aufruf über den Recherchezugang fehlgeschlagen; der Volltextabgleich bleibt offen.
- DEGUM- und aktuelle lokale Ausbildungs-/Hygienestandards sowie aktuelle internationale LUS-/PoCUS-Empfehlungen müssen im klinischen Review abgeglichen werden. Keine DEGUM-Freigabe wird behauptet.

## Besonders sensible Aussagen

Die Prüfung muss ausdrücklich bestätigen, dass A-Linien Artefakte und B-Linien nicht krankheitsspezifisch sind; Sliding nur am untersuchten Ort interpretiert wird; fehlendes Sliding allein keinen Pneumothorax beweist; ein Lung Point fehlen kann; negative eFAST relevante Verletzungen nicht ausschließt; Perikarderguss und Tamponade unterschieden werden; FoCUS keine umfassende Echokardiographie ersetzt.

`tests/fixtures/medical-baseline.json` ist ein versionierter, quellenverknüpfter **redaktioneller Regressionsstand**, nicht fachärztlich geprüfte Referenzdaten. Texttests schützen diese Einschränkungen vor versehentlichem Entfernen, beweisen aber weder semantische Vollständigkeit noch klinische Richtigkeit. Sobald eine qualifizierte Person geprüft hat, sowohl Inhalt als auch Referenzstand nachvollziehbar versionieren.

## Vorhandene und fehlende Originalaufnahmen

Sieben CC-BY-2.0-Clips von Gillman/Kirkpatrick (2012) sind lokal vorhanden: Lung Sliding, Power Slide, vertikale Artefakte, Lung Point, Konsolidierung, interstitielles Muster und Pleuralflüssigkeit. Herkunft, Lizenz, Änderungsangaben und Dateiprüfsummen stehen in [docs/media/README.md](docs/media/README.md). Die Aufnahme zum interstitiellen Muster stammt laut Quelle von einer Lungenkontusion und ist kein Beleg für den erfundenen Herzinsuffizienzfall.

`media-trauma` bleibt `pending`: Für freie intraperitoneale Flüssigkeit fehlt noch ein geeigneter Originalclip. Ein anatomisches Lehrdiagramm illustriert den hepatorenalen Raum. Zur vollständigen eFAST-Ausbildung fehlen weitere dokumentierte Fenster sowie Normal- und Differenzialbefunde.

Die vorhandenen Clips sind **Referenzaufnahmen**, keine kalibrierten Simulator-Datensätze. Es werden keine Patientenseite, Sondenwinkel oder virtuelle Positionen aus den Clips abgeleitet. Die fünf animierten Lehrdiagramme sind schematisch und keine synthetischen diagnostischen Ultraschallbilder.

Reviewstatus ist in dieser Arbeitsversion informativ und blockiert weder Clips noch Diagramme. Frühere explizit als „TEST (temporary, not a real review)“ markierte Platzhalter wurden auf ausstehende Fachprüfung zurückgesetzt; es wird keine reale Prüfung behauptet.

## Verfahren für spätere Freigaben

1. Quellenfassung und konkrete Fundstelle prüfen; Text und klinische Grenzen gegebenenfalls korrigieren.
2. Fachqualifikation und tatsächliche Prüfung organisatorisch dokumentieren. Erst danach Reviewer und reales Prüfdatum eintragen und den betreffenden Datensatz auf `medically-reviewed` setzen. Das Prüfdatum darf nicht älter als die letzte Inhaltsänderung sein.
3. Für Medien Herkunft, Patientenanonymisierung, Lizenzname/-URL, Attribution, Erlaubnis zur Weiterverbreitung und gegebenenfalls Bearbeitung belegen. `rightsEvidence` muss auf einen intern nachvollziehbaren Beleg verweisen, ohne personenbezogene Daten im Repository zu veröffentlichen.
4. Für eine spätere Kalibrierung auf virtuelle Schallkopfpositionen reale Aufnahmeparameter einschließlich Position, Orientierung, Bildschirmmarker und aufgezeichneter Tiefe erfassen. Referenzclips dürfen ohne solche Kalibrierung separat gezeigt werden. Toleranzen nur nach konkreter Validierung festlegen; keine automatisch angenommene kontinuierliche Anatomie.
5. `npm test`, `npm run validate:medical`, Browserprüfungen und zuletzt `npm run validate:publication` ausführen. Der letzte Befehl schlägt im aktuellen Entwurfsstand absichtlich fehl.

Die technische Freigabeprüfung kann nur Vollständigkeit prüfen; die Echtheit eines eingetragenen Reviewers oder Rechtebelegs bleibt menschliche Verantwortung.

## Neuer Röntgen-Kurs (02.11.2026)

12 Lektionen, 37 Übungen und fünf Originalaufnahmen aus vier Untersuchungen.
Status: `awaiting-medical-review`. Medizinische Quellen stehen bei jeder
Lektion; Lizenzen und verwendete Dateiversionen in
[ROENTGEN.md](docs/media/ROENTGEN.md).

Vor medizinischer Veröffentlichung insbesondere prüfen:

- Bildbefunde und Toleranzbereiche der freien Bildmarkierung am Radius, an der linken
  Klavikula sowie an Tibia und Fibula.
- Richtungsangaben beim Colles-Muster, Gelenkbeteiligung und Formulierungen
  zu den Grenzen einzelner Projektionen.
- Umgang mit klinischem Frakturverdacht bei unauffälligem Erstbild gemäß
  ACR, einschließlich der situationsabhängigen weiteren Bildgebung.

Die Originalmarkierungen der Radiusaufnahme bleiben ausdrücklich kenntlich.
Die Kurswiederholung nutzt bekannte Trainingsbilder, keine behauptete
Validierung der Befundkompetenz an unbekannten Fällen.
