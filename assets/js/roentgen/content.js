/* Original German teaching material. Clinical references and media rights travel
   with the content; images are licensed recordings, never generated findings. */
(function (root, factory) {
  const content = factory();
  if (typeof module === 'object' && module.exports) module.exports = content;
  else root.XRAY_CONTENT = content;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const sources = [
    { id: 'system', title: 'Radiology Masterclass · Fracture description', url: 'https://www.radiologymasterclass.co.uk/tutorials/musculoskeletal/trauma/trauma_x-ray_page1' },
    { id: 'fragments', title: 'Radiology Masterclass · Comminuted fractures', url: 'https://www.radiologymasterclass.co.uk/tutorials/musculoskeletal/trauma/trauma_x-ray_page2' },
    { id: 'wrist', title: 'The Radiology Assistant · Wrist fractures', url: 'https://radiologyassistant.nl/musculoskeletal/wrist/fractures' },
    { id: 'acr', title: 'ACR · Acute Hand and Wrist Trauma', url: 'https://acsearch.acr.org/docs/69418/Narrative/' },
    { id: 'aaos', title: 'AAOS · Fractures (Broken Bones)', url: 'https://www.orthoinfo.org/diseases--conditions/fractures-broken-bones/' },
    { id: 'radius', title: 'University of Maryland · Fractures of the distal radius', url: 'https://www.medschool.umaryland.edu/em/cme/umem-educational-pearls/?id=2809' },
  ];
  const media = [
    { id: 'normal-pa', file: 'normal-pa.jpg', title: 'Handgelenk · Frontalaufnahme', width: 690, height: 2122,
      author: 'Mikael Häggström, M.D.', license: 'CC0 1.0', licenseURL: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'https://commons.wikimedia.org/wiki/File:X-ray_of_normal_wrist_by_dorsoplantar_projection.jpg',
      finding: 'Unauffälliges Beispiel: durchgehende Kortikalis an Radius und Ulna, keine offensichtliche Frakturlinie.',
      focus: 'Verfolge beide Knochenränder vom Schaft bis zur Gelenkfläche.', normal: true,
      limits: 'Eine einzelne Projektion schließt eine Fraktur oder Bandverletzung nicht aus.' },
    { id: 'normal-lateral', file: 'normal-lateral.jpg', title: 'Handgelenk · Seitenaufnahme', width: 559, height: 1756,
      author: 'Mikael Häggström, M.D.', license: 'CC0 1.0', licenseURL: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: 'https://commons.wikimedia.org/wiki/File:X-ray_of_normal_wrist_by_lateral_projection.jpg',
      finding: 'Unauffällige seitliche Referenz desselben Handgelenks. Die Handwurzelknochen überlagern sich.',
      focus: 'Vergleiche die seitliche Ansicht mit der Frontalaufnahme.', normal: true,
      limits: 'Zusätzliche Projektionen können je nach Fragestellung nötig sein.' },
    { id: 'wrist-fracture', file: 'wrist-fracture.jpg', title: 'Handgelenk · Mehrere Ansichten', width: 3465, height: 2860,
      author: 'Ashish j29', license: 'CC BY 3.0', licenseURL: 'https://creativecommons.org/licenses/by/3.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Colles_fracture.JPG', annotated: true,
      finding: 'Distale Radiusfraktur mit Versatz und Abkippung des distalen Fragments, entsprechend einem Colles-Muster.',
      focus: 'Vergleiche die unterbrochenen Knochenränder in den bereits im Original eingekreisten Bereichen.',
      limits: 'Die Markierungen sind Teil des Originals. Zur Beurteilung von Gelenkbeteiligung und Begleitverletzungen braucht es die vollständige Bildserie.' },
    { id: 'clavicle', file: 'clavicle.jpg', title: 'Schlüsselbein · Frontalaufnahme', width: 2054, height: 1438,
      author: 'Majorkev', license: 'CC BY 3.0', licenseURL: 'https://creativecommons.org/licenses/by/3.0/',
      source: 'https://commons.wikimedia.org/wiki/File:Clavicle_Fracture_Left.jpg',
      originalURL: 'https://upload.wikimedia.org/wikipedia/commons/archive/8/85/20171012094305%21Clavicle_Fracture_Left.jpg',
      finding: 'Deutlich dislozierte Fraktur im Schaftbereich der linken Klavikula. Die Fragmente stehen versetzt.',
      focus: 'Folge dem Schlüsselbein vom Brustbein nach lateral. In der Mitte reißt die Kontur ab.',
      limits: 'Ein Bild allein erlaubt keine vollständige Beurteilung der Weichteile oder der Stabilität.' },
    { id: 'lower-leg', file: 'lower-leg.jpg', title: 'Unterschenkel · Frontalaufnahme', width: 753, height: 2260,
      author: 'Jalo; Bildversion von Quatar', license: 'Public Domain', licenseURL: 'https://commons.wikimedia.org/wiki/Template:PD-self',
      source: 'https://commons.wikimedia.org/wiki/File:Tibia_and_fibula_fracture.jpg',
      finding: 'Frakturen von Tibia und Fibula auf unterschiedlicher Höhe. Auch der dünnere Knochen ist verletzt.',
      focus: 'Prüfe zuerst die breite Tibia, dann die gesamte schmalere Fibula.',
      limits: 'Das Knie ist hier nicht vollständig dargestellt. Die Aufnahme ersetzt keine vollständige Untersuchung.' },
  ];
  const mc = (id, title, options, correct, explanation, image) => ({ id, type: 'mc', title, options, correct, explanation, image });
  const spot = (id, title, image, target, explanation) => ({ id, type: 'spot', title, image, target, explanation });
  const order = (id, title, options, explanation) => ({ id, type: 'order', title, options, correct: options.map((_, i) => i), explanation });
  const explain = (title, body, covers) => ({ title, body, covers });
  const normal = () => mc('normal-finding', 'Wie beschreibst du die Knochenkontur in diesem Beispiel?', ['Durchgehend, ohne offensichtliche Unterbrechung', 'Deutlich versetzte Fragmente', 'Sicherer Ausschluss jeder Verletzung'], 0, 'Hier ist kein offensichtlicher Kortikalisbruch zu sehen. Das ist eine Bildbeschreibung; ein sicherer Verletzungsausschluss folgt daraus nicht.', 'normal-pa');
  const clavicleSpot = () => spot('clavicle-spot', 'Wo ist die Kontinuität des Schlüsselbeins unterbrochen?', 'clavicle', { x: 52, y: 22, rx: 8, ry: 13 }, 'Am Frakturspalt im Klavikulaschaft stehen die beiden Knochenenden deutlich versetzt. Die grüne Umrandung zeigt die gesuchte Stelle.');
  const tibiaSpot = () => spot('tibia-spot', 'Finde die Fraktur der breiten Tibia.', 'lower-leg', { x: 42, y: 55, rx: 9, ry: 3.5 }, 'An der markierten Stelle ist die Tibia-Kortikalis unterbrochen. Weiter distal ist zusätzlich die schmalere Fibula gebrochen.');
  const fibulaSpot = () => spot('fibula-spot', 'Finde die zusätzliche Fraktur der Fibula.', 'lower-leg', { x: 64, y: 71, rx: 8, ry: 3.5 }, 'Die grün umrandete Stelle zeigt die Fibulafraktur. Diese zweite Verletzung liegt weiter distal als die Tibiafraktur.');
  const occult = () => mc('occult', 'Nach einem Sturz bleibt ein begründeter Frakturverdacht, obwohl das erste Handgelenk-Röntgen unauffällig ist. Was passt?', ['Eine Fraktur ist damit sicher ausgeschlossen', 'Klinisch weiter abklären; je nach Befund zusätzliche Bildgebung', 'Nur die Bildhelligkeit erhöhen, dann ist alles geklärt'], 1, 'Ein unauffälliges Erstbild beendet einen begründeten Verdacht nicht. Nach ACR kommen je nach Situation MRT, CT ohne Kontrastmittel oder Kontrollaufnahmen infrage.');
  const sequence = () => order('reading-order', 'Baue die Checkliste in der hier gelernten Reihenfolge auf.', ['Bild und Seite prüfen', 'Achsstellung prüfen', 'Knochenkonturen verfolgen', 'Gelenke und Weichteile prüfen'], 'Eine feste Routine hilft beim vollständigen Durchmustern. Andere systematische Abläufe sind ebenfalls möglich.');
  const lessons = [
    { id: 'bildstart', title: 'Bevor du loslegst', unit: 1, icon: '👀', image: 'normal-pa', refs: ['acr'],
      intro: 'Jedes Bild beginnt mit Orientierung. Prüfe Identität, Datum, Körperregion, Seitenmarker und Projektion. Das Vorschaubild allein erzählt nicht die ganze Geschichte.',
      tip: 'Erst zuordnen. Dann beurteilen.',
      teaching: [
        explain('1. Passt die Aufnahme zur Frage?', 'Prüfe zuerst Person, Datum, Körperregion und Seitenmarker. Danach kommen Projektion und Bildqualität: Welche Ansicht liegt vor, und sind die Knochenränder gut erkennbar? Erst dann beginnt die Suche nach einer Verletzung.', ['start-check']),
        explain('2. Warum mehrere Ansichten?', 'Ein Röntgenbild bildet räumliche Strukturen auf einer Fläche ab. Knochen können sich überlagern. Eine andere Projektion macht sonst verdeckte Konturen sichtbar. Frontal- und Seitenaufnahme ergänzen sich; am Handgelenk werden häufig drei Ansichten benötigt.', ['views']),
        explain('3. Der Bildrand ist eine Grenze', 'Ist die schmerzhafte Region abgeschnitten, kannst du diesen Teil nicht beurteilen. Benenne die unvollständige Darstellung und lasse die Aufnahme passend ergänzen. Vergrößern zeigt vorhandene Bildpunkte genauer, aber keine fehlende Anatomie.', ['image-limit']),
      ],
      questions: [
        mc('start-check', 'Was prüfst du vor der Suche nach einer Fraktur?', ['Nur die hellste Stelle', 'Zuordnung, Seite, Projektion und Bildqualität', 'Sofort die Therapie'], 1, 'Die Aufnahme muss zur Person, Seite und Fragestellung passen. Prüfe außerdem, ob die relevante Region gut dargestellt ist.', 'normal-pa'),
        mc('views', 'Warum betrachtest du unterschiedliche Projektionen?', ['Sie zeigen räumliche Beziehungen und sonst verdeckte Befunde', 'Eine zweite Ansicht ist nur Dekoration', 'Weil jede Ansicht einen anderen Patienten zeigt'], 0, 'Überlagerungen verändern sich mit der Projektion. Zwei Ebenen sind häufig die Basis; am Handgelenk werden oft drei Ansichten benötigt.', 'normal-lateral'),
        mc('image-limit', 'Die schmerzhafte Region ist am Bildrand abgeschnitten. Was ist sinnvoll?', ['Den fehlenden Bereich als normal bewerten', 'Nur hineinzoomen', 'Unvollständige Darstellung benennen und gezielt ergänzen lassen'], 2, 'Nicht dargestellte Strukturen lassen sich nicht beurteilen. Zoomen holt fehlende Anatomie nicht zurück.'),
      ] },
    { id: 'systematik', title: 'Dein Blick mit System', unit: 1, icon: '🧭', image: 'normal-pa', refs: ['system'],
      intro: 'Nutze immer dieselbe Suchroutine: Bild prüfen, Achsen ansehen, Knochenränder verfolgen, Gelenke und Weichteile durchmustern. Gehe auch nach einem Treffer bis zum Ende weiter.',
      tip: 'Ein Fund ist ein Zwischenstopp, kein Ende.',
      teaching: [
        explain('1. Deine Suchroutine', 'Arbeite hier immer in dieser Reihenfolge: Bild und Seite prüfen → Achsstellung prüfen → Knochenkonturen verfolgen → Gelenke und Weichteile prüfen. Ein fester Ablauf hilft, auch weniger auffällige Bereiche bewusst anzusehen.', ['reading-order']),
        explain('2. Kortikalis: der äußere Knochenrand', 'Die Kortikalis ist die dichte äußere Knochenschicht. Im Bild erscheint sie als heller Rand. Verfolge jeden sichtbaren Rand fortlaufend vom einen Knochenende zum anderen und achte auf Unterbrechungen oder Stufen.', ['cortex-check']),
        explain('3. Nach einem Treffer weitersuchen', 'Eine offensichtliche Fraktur kann den Blick auf sich ziehen. Trotzdem prüfst du die übrigen Knochen, benachbarte Gelenke und Weichteile weiter. Eine zweite Verletzung kann an einer anderen Stelle liegen.', ['after-find']),
      ],
      questions: [sequence(), mc('cortex-check', 'Wie untersuchst du die Kortikalis?', ['Nur an der schmerzhaften Stelle kurz hinsehen', 'Jeden sichtbaren Knochenrand fortlaufend verfolgen', 'Nur die Knochenmitte betrachten'], 1, 'Ein fortlaufender Blick auf die Ränder macht kleine Unterbrechungen leichter erkennbar.', 'normal-pa'), mc('after-find', 'Eine Fraktur ist gefunden. Was folgt?', ['Die übrigen Knochen und Gelenke weiter prüfen', 'Das Bild sofort schließen', 'Alle übrigen Strukturen als normal werten'], 0, 'Begleitverletzungen können an anderer Stelle liegen. Führe deine Routine vollständig zu Ende.') ] },
    { id: 'normalbild', title: 'Normal erkennen', unit: 1, icon: '🦴', image: 'normal-pa', refs: ['wrist', 'acr'],
      intro: 'Die Kortikalis ist der dichte äußere Knochenrand. Gelenkspalten liegen zwischen Knochen; sie sind keine Frakturlinien. Vergleiche Konturen in allen verfügbaren Ansichten.',
      tip: 'Beschreibe, was du siehst. Benenne, was offenbleibt.',
      teaching: [
        explain('1. So beschreibst du einen unauffälligen Rand', 'Im normalen Beispiel läuft die helle Kortikalis ohne offensichtliche Unterbrechung oder Stufe weiter. Das ist eine Beobachtung an dieser Aufnahme. Sie beweist nicht, dass jede Fraktur oder Bandverletzung ausgeschlossen ist.', ['normal-finding']),
        explain('2. Radius und Ulna unterscheiden', 'Radius heißt Speiche, Ulna heißt Elle. Nahe dem Handgelenk ist der Radius der breitere Knochen auf der Daumenseite. Distal bedeutet hier: zum Handgelenk hin. In dieser Frontalaufnahme liegt der distale Radius rechts im Bild, die Ulna links daneben.', ['radius-anatomy']),
        explain('3. Gelenkspalt oder Frakturlinie?', 'Der Gelenkspalt ist die dunkle Lücke zwischen zwei Knochen, etwa zwischen Radius und Handwurzel. Eine Frakturlinie verläuft dagegen innerhalb eines Knochens. Beurteile dabei immer auch die angrenzenden Knochenkonturen.', ['joint-space']),
      ],
      questions: [normal(), spot('radius-anatomy', 'Zeige auf den distalen Radius nahe dem Handgelenk.', 'normal-pa', { x: 66, y: 40, rx: 18, ry: 6 }, 'Die breitere Speiche nahe dem Handgelenk ist der distale Radius. Die Ulna liegt in dieser Aufnahme links daneben.'), mc('joint-space', 'Die dunkle Linie zwischen Radius und Handwurzel ist hier …', ['immer eine Fraktur', 'der Gelenkspalt', 'eine Metallplatte'], 1, 'Ein regelrecht gelegener Gelenkspalt trennt zwei Knochen. Eine Frakturlinie verläuft innerhalb eines Knochens.', 'normal-pa') ] },
    { id: 'kortikalis', title: 'Die Bruchstelle finden', unit: 2, icon: '🔎', image: 'lower-leg', refs: ['system', 'aaos'],
      intro: 'Suche nach einer unterbrochenen Kortikalis, einer Stufe oder einer untypischen Linie im Knochen. Ein klarer Versatz der Knochenenden ist ein starkes Frakturzeichen.',
      tip: 'Folge der hellen Linie bis zur Unterbrechung.',
      teaching: [
        explain('1. Ein direktes Frakturzeichen', 'Ein Kortikalisabbruch ist eine Unterbrechung des hellen äußeren Knochenrandes. Auch eine Stufe, ein Frakturspalt oder gegeneinander versetzte Knochenenden können auffallen. Nicht jeder dunkle Bereich ist ein Bruch: Gelenkspalten liegen zwischen Knochen.', ['direct-sign']),
        explain('2. Zuerst die Tibia verfolgen', 'Die Tibia ist das breite Schienbein. Folge in der Aufnahme beiden Rändern nach unten. Dort, wo die bisher durchgehende Kontur abreißt und die Knochenenden nicht mehr zusammenpassen, liegt die gesuchte Fraktur.', ['tibia-spot']),
        explain('3. Dann die Fibula ansehen', 'Die Fibula ist das schmalere Wadenbein neben der Tibia. Verfolge auch sie vollständig. In diesem Lehrbild ist sie ebenfalls gebrochen; ihre Bruchstelle liegt weiter zum Sprunggelenk hin als die der Tibia.', ['fibula-spot']),
      ],
      questions: [tibiaSpot(), mc('direct-sign', 'Welches ist ein direktes knöchernes Frakturzeichen?', ['Ein sichtbarer Kortikalisabbruch', 'Jeder dunkle Bildbereich', 'Nur die Beschriftung des Bildes'], 0, 'Ein Kortikalisabbruch bedeutet eine Unterbrechung des äußeren Knochenrandes.'), fibulaSpot()] },
    { id: 'handgelenk', title: 'Fall: Handgelenk', unit: 2, icon: '✋', image: 'wrist-fracture', refs: ['wrist', 'radius'],
      intro: 'Die Originalaufnahme zeigt bereits markierte Bruchstellen. Vergleiche den distalen Radius in den verschiedenen Ansichten: Kontur, Stellung der Fragmente und Nähe zur Gelenkfläche.',
      tip: 'Erkenne den Befund hinter der Markierung.',
      teaching: [
        explain('1. Was bedeutet distale Radiusfraktur?', 'Der Radius ist die Speiche. Sein distales Ende liegt direkt am Handgelenk. Eine distale Radiusfraktur ist ein Bruch in diesem Abschnitt. Die Kreise in der Originalaufnahme zeigen diesen Bereich in mehreren Ansichten.', ['wrist-bone']),
        explain('2. Versatz und Abkippung erkennen', 'Vergleiche die Knochenränder vor und hinter dem Bruch: Bei einem Versatz stehen die Fragmente gegeneinander verschoben. Bei einer Abkippung bilden ihre Achsen einen Winkel. Im gezeigten Beispiel ist die Kontur unterbrochen und die Stellung des distalen Fragments verändert.', ['wrist-pattern']),
        explain('3. Das klassische Colles-Muster', 'Beim Colles-Muster ist der distale Radius gebrochen und das distale Fragment nach dorsal abgekippt beziehungsweise verschoben. Dorsal bedeutet zur Handrückenseite; palmar bedeutet zur Handfläche. Die Richtung beurteilst du besonders in der Seitenaufnahme.', ['colles']),
      ],
      questions: [mc('wrist-bone', 'Welcher Knochen ist in den markierten Bereichen gebrochen?', ['Der Humerus', 'Der Radius nahe dem Handgelenk', 'Die Klavikula'], 1, 'Die Markierungen liegen am distalen Radius. Distal bedeutet hier: zum Handgelenk hin.', 'wrist-fracture'), mc('wrist-pattern', 'Welche Beschreibung passt zu diesem Lehrbeispiel?', ['Distale Radiusfraktur mit Versatz und Abkippung', 'Unauffälliger Radiusschaft', 'Isolierte Rippenfraktur'], 0, 'Die Kontur ist unterbrochen, und das distale Fragment steht gegenüber dem Schaft verändert.', 'wrist-fracture'), mc('colles', 'Was kennzeichnet das klassische Colles-Muster?', ['Palmarer Versatz der Ulna am Ellenbogen', 'Fraktur im Schlüsselbein', 'Distale Radiusfraktur mit dorsaler Abkippung bzw. Verschiebung'], 2, 'Dorsal bedeutet zur Handrückenseite. Die Richtung beurteilst du in einer passenden seitlichen Aufnahme.') ] },
    { id: 'schluesselbein', title: 'Fall: Schlüsselbein', unit: 2, icon: '🩻', image: 'clavicle', refs: ['system', 'aaos'],
      intro: 'Das Schlüsselbein verbindet Brustbein und Schultergürtel. Folge seinem Verlauf. Hier stehen die Fragmente im Schaftbereich deutlich auseinander und auf unterschiedlicher Höhe.',
      tip: 'Ein Versatz ist leichter zu sehen, wenn du beide Ränder verfolgst.',
      teaching: [
        explain('1. Klavikula heißt Schlüsselbein', 'Die Klavikula verläuft zwischen Brustbein und Schultergürtel. Ihr längerer mittlerer Abschnitt heißt Schaft. Folge im Bild ihrem gebogenen Verlauf und unterscheide sie vom Oberarmkopf und den darunterliegenden Rippen.', ['clavicle-location']),
        explain('2. Die Unterbrechung finden', 'Verfolge die obere und die untere Kontur des Schlüsselbeins. Im Schaft endet die durchgehende Kontur; die beiden Knochenenden stehen auseinander und auf unterschiedlicher Höhe. Hier liegt der sichtbare Frakturspalt.', ['clavicle-spot']),
        explain('3. Den sichtbaren Befund benennen', 'Disloziert bedeutet, dass die Fragmente gegeneinander versetzt stehen. Eine passende Beschreibung ist daher: dislozierte Klavikulaschaftfraktur. Ob eine Wunde bis zur Fraktur reicht oder wie stabil die Verletzung ist, klärt dieses einzelne Bild allein nicht.', ['clavicle-report']),
      ],
      questions: [clavicleSpot(), mc('clavicle-location', 'Wo liegt die sichtbare Verletzung?', ['Im Klavikulaschaft', 'Im Humeruskopf', 'In der Wirbelsäule'], 0, 'Die Unterbrechung liegt im Schaft des Schlüsselbeins.', 'clavicle'), mc('clavicle-report', 'Welche Aussage beschreibt das sichtbare Bild am besten?', ['Sicher geschlossene, stabile Fraktur', 'Dislozierte Klavikulaschaftfraktur', 'Keine knöcherne Verletzung'], 1, 'Der Fragmentversatz ist sichtbar. Ob eine Fraktur offen ist und wie stabil sie ist, lässt sich daraus allein nicht sicher bestimmen.', 'clavicle') ] },
    { id: 'bruchformen', title: 'Bruchformen verstehen', unit: 3, icon: '📐', refs: ['system', 'fragments'], diagram: 'patterns',
      intro: 'Beschreibe den Verlauf zur Knochenachse: quer, schräg oder spiralförmig. Mehr als zwei getrennte Knochenfragmente werden als Mehrfragmentfraktur bezeichnet.',
      tip: 'Form, Ort und Stellung ergeben zusammen den Befund.',
      teaching: [
        explain('1. Quer zur Knochenachse', 'Stelle dir eine Linie längs durch den Knochenschaft vor. Verläuft die Bruchlinie ungefähr rechtwinklig dazu, heißt der Bruch Querfraktur. Entscheidend ist die Richtung zum Knochen, nicht zum Rand des Bildschirms.', ['transverse']),
        explain('2. Schräg oder spiralförmig', 'Bei einer Schrägfraktur zieht die Bruchlinie diagonal durch den Schaft. Bei einer Spiralfraktur windet sie sich um den Knochen. Der Verlauf lässt sich mit mehreren Ansichten besser verstehen als mit einer einzelnen Projektion.', ['oblique']),
        explain('3. Die Fragmente mitzählen', 'Ein Fragment ist ein getrenntes Knochenstück. Entstehen mehr als zwei getrennte Knochenfragmente, spricht man von einer Mehrfragmentfraktur. Diese Angabe ergänzt die Beschreibung des Bruchverlaufs.', ['comminuted']),
      ],
      questions: [mc('transverse', 'Die Bruchlinie steht senkrecht zur Längsachse. Welche Form ist das?', ['Querfraktur', 'Spiralfraktur', 'Luxation'], 0, 'Quer beschreibt eine Bruchlinie ungefähr rechtwinklig zur Knochenachse.', null), mc('oblique', 'Eine schräg zur Schaftachse verlaufende Linie heißt …', ['Querfraktur', 'Schrägfraktur', 'Gelenkspalt'], 1, 'Bei der Schrägfraktur verläuft die Linie diagonal durch den Knochen.'), mc('comminuted', 'Mehr als zwei getrennte Knochenfragmente: welcher Begriff passt?', ['Unauffälliger Knochen', 'Reine Luxation', 'Mehrfragmentfraktur'], 2, 'Eine Fraktur mit mehr als zwei getrennten Komponenten wird als Mehrfragmentfraktur beschrieben.') ] },
    { id: 'stellung', title: 'Versatz beschreiben', unit: 3, icon: '↗️', image: 'clavicle', refs: ['wrist', 'system'],
      intro: 'Dislokation bedeutet eine veränderte Fragmentstellung. Unterscheide seitlichen Versatz, Abkippung und Verkürzung. Beschreibe das distale Fragment im Verhältnis zum proximalen.',
      tip: 'Die Perspektive gehört zur Beschreibung dazu.',
      teaching: [
        explain('1. Was ist eine Dislokation?', 'Dislokation beschreibt eine veränderte Fragmentstellung. Im Schlüsselbeinbeispiel ist ein deutlicher Versatz sichtbar. Daraus liest du keine sichere Nervenfunktion oder Bandstabilität ab; diese brauchen weitere klinische Beurteilung.', ['displacement']),
        explain('2. Einen festen Bezug verwenden', 'Proximal bedeutet rumpfnah, distal rumpffern. Bei der Stellungsbeschreibung beziehst du das distale Fragment auf das proximale. Benenne dabei die betrachtete Projektion, damit die Richtungsangabe nachvollziehbar bleibt.', ['distal-reference']),
        explain('3. Versatz ist nicht dasselbe wie Abkippung', 'Seitlicher Versatz bedeutet eine Verschiebung der Fragmente. Abkippung bedeutet eine Winkelabweichung ihrer Achsen. Überlappende Enden können zusätzlich eine Verkürzung erzeugen. Eine Fraktur kann mehrere dieser Stellungsänderungen gleichzeitig zeigen.', ['angle']),
      ],
      questions: [mc('displacement', 'Was ist hier unmittelbar erkennbar?', ['Die Fragmente stehen versetzt', 'Ein sicherer Nervenschaden', 'Die genaue Bandstabilität'], 0, 'Die knöchernen Konturen stehen versetzt. Nervenfunktion und Bandstabilität erfordern weitere Beurteilung.', 'clavicle'), mc('distal-reference', 'Worauf beziehst du die Stellung des distalen Fragments?', ['Auf den Bildrand', 'Auf das proximale Fragment', 'Auf die Helligkeit'], 1, 'Ein fester Bezug verhindert missverständliche Richtungsangaben.'), mc('angle', 'Abkippung beschreibt …', ['die Anzahl der Aufnahmen', 'die Länge des Bildes', 'eine Winkelabweichung der Fragmente'], 2, 'Abkippung und seitlicher Versatz sind unterschiedliche Merkmale. Eine Fraktur kann beides zeigen.') ] },
    { id: 'unterschenkel', title: 'Zwei Knochen prüfen', unit: 3, icon: '🦵', image: 'lower-leg', refs: ['system', 'aaos'],
      intro: 'Am Unterschenkel liegen Tibia und Fibula nebeneinander. Die größere Fraktur zieht den Blick auf sich. Verfolge auch den zweiten Knochen über seine gesamte sichtbare Länge.',
      tip: 'Ein Knochen gebrochen? Den zweiten bewusst prüfen.',
      teaching: [
        explain('1. Den zweiten Knochen bewusst verfolgen', 'Die breite Tibia ist das Schienbein, die schmale Fibula das Wadenbein. Nach der Tibia prüfst du deshalb auch beide Ränder der Fibula über ihre ganze sichtbare Länge. Ihre Fraktur liegt hier weiter distal, also näher am Sprunggelenk.', ['fibula-spot']),
        explain('2. Beide Verletzungen zusammen beschreiben', 'Dieses Bild zeigt Frakturen beider Unterschenkelknochen auf unterschiedlicher Höhe. Ein Befund, der nur die Tibia erwähnt, wäre unvollständig. Nenne deshalb Tibia und Fibula und unterscheide die Höhe ihrer Bruchstellen.', ['leg-report']),
        explain('3. Was fehlt in dieser Aufnahme?', 'Das Knie ist am oberen Bildrand nicht vollständig dargestellt. Über den fehlenden Abschnitt kannst du keine sichere Aussage treffen. Benachbarte Gelenke müssen passend zur Verletzung mitbeurteilt und bei Bedarf zusätzlich abgebildet werden.', ['leg-limit']),
      ],
      questions: [fibulaSpot(), mc('leg-report', 'Welche Zusammenfassung passt zu dieser Aufnahme?', ['Nur die Tibia ist gebrochen', 'Tibia- und Fibulafraktur auf unterschiedlicher Höhe', 'Ausschließlich eine Bandverletzung'], 1, 'Die Tibia zeigt eine Fraktur, zusätzlich ist die Fibula weiter distal unterbrochen.', 'lower-leg'), mc('leg-limit', 'Welche Einschränkung hat die gezeigte Aufnahme?', ['Das Knie ist nicht vollständig abgebildet', 'Es ist überhaupt kein Knochen sichtbar', 'Die Knochen sind nur ein Lehrdiagramm'], 0, 'Die Beurteilung endet an den Bildgrenzen. Benachbarte Gelenke müssen passend zur Verletzung mitbeurteilt werden.', 'lower-leg') ] },
    { id: 'grenzen', title: 'Grenzen erkennen', unit: 4, icon: '💡', image: 'normal-pa', refs: ['acr', 'aaos', 'wrist'],
      intro: 'Eine unauffällige Aufnahme ist kein universeller Entwarnungsbefund. Auch nicht verschobene oder verdeckte Frakturen sind möglich. Verknüpfe Bild, Beschwerden und Untersuchung.',
      tip: 'Unsicherheit benennen ist Teil einer guten Befundung.',
      teaching: [
        explain('1. Ein unauffälliges Erstbild beendet den Verdacht nicht', 'Eine nicht verschobene oder verdeckte Fraktur kann zunächst unsichtbar bleiben. Bei weiter begründetem Verdacht am Handgelenk folgt eine klinische Abklärung. Je nach Situation kommen MRT, CT ohne Kontrastmittel oder spätere Kontrollaufnahmen infrage.', ['occult']),
        explain('2. Offen oder geschlossen?', 'Offen bedeutet eine Verbindung der Fraktur zur Außenwelt über eine Wunde. Eine Frakturlinie allein zeigt dir das nicht sicher. Dazu gehört die klinische Wundbeurteilung; Helligkeit und Projektion entscheiden diese Frage nicht.', ['open-fracture']),
        explain('3. Intraartikulär heißt: bis in die Gelenkfläche', 'Erreicht die Fraktur eine Gelenkfläche, nennt man sie intraartikulär. Diese Gelenkbeteiligung gehört in die Befundbeschreibung. Wenn ihre Ausdehnung im Röntgen nicht ausreichend erkennbar ist, kann zusätzliche Bildgebung nötig sein.', ['intraarticular']),
      ],
      questions: [occult(), mc('open-fracture', 'Kannst du allein aus einer Frakturlinie sicher erkennen, ob die Fraktur offen ist?', ['Ja, jede helle Fraktur ist offen', 'Nein, dafür ist die klinische Wundbeurteilung nötig', 'Ja, wenn das Bild seitlich ist'], 1, 'Offen bedeutet eine Verbindung der Fraktur zur Außenwelt über eine Wunde. Das ist eine klinische Beurteilung.'), mc('intraarticular', 'Was bedeutet intraartikulär?', ['Die Fraktur erreicht die Gelenkfläche', 'Die Fraktur liegt nur in der Haut', 'Der Knochen ist unverletzt'], 0, 'Eine Gelenkbeteiligung gehört in die Befundbeschreibung und kann zusätzliche Bildgebung zur genauen Beurteilung erfordern.') ] },
    { id: 'bildvergleich', title: 'Dein Blick im Wechsel', unit: 4, icon: '🎯', image: 'normal-lateral', refs: ['wrist', 'system'],
      intro: 'Wechsle jetzt zwischen Normalbild und Verletzung. Suche zuerst selbst, formuliere eine Beobachtung und entscheide erst dann. Die gleichen Trainingsbilder helfen dir beim Festigen.',
      tip: 'Beobachtung vor Etikett.',
      teaching: [
        explain('1. Das Normalbild als Vergleich', 'Eine durchgehende Kortikalis ohne offensichtlichen Versatz ist der Ausgangspunkt. Formuliere zunächst genau diese Beobachtung. Ein unauffälliger sichtbarer Knochenrand ist dabei kein sicherer Ausschluss aller Verletzungen.', ['normal-finding']),
        explain('2. Das Schlüsselbein wiedererkennen', 'Folge der Klavikula vom Brustbein zur Schulter. Im bekannten Frakturbeispiel ist die Schaftkontur unterbrochen und die Fragmentstellung verändert. Suche diese Kontinuitätsunterbrechung selbst im unmarkierten Bild.', ['clavicle-spot']),
        explain('3. Das verletzte Handgelenk vergleichen', 'Am normalen distalen Radius passen die Knochenkonturen zusammen. Im Frakturbeispiel sind sie unterbrochen und die Fragmente anders gestellt. Benenne diese Unterschiede; die Kreise im Original helfen bei der Zuordnung der Ansichten.', ['compare-wrist']),
      ],
      questions: [normal(), clavicleSpot(), mc('compare-wrist', 'Was unterscheidet dieses Beispiel vom unauffälligen Handgelenk?', ['Die Aufnahme ist grundsätzlich immer krankhaft', 'Es sind überhaupt keine Gelenke zu sehen', 'Unterbrochene Konturen und veränderte Fragmentstellung'], 2, 'Die Fraktur verändert Kontur und Stellung am distalen Radius. Die Originalmarkierungen unterstützen den Vergleich.', 'wrist-fracture') ] },
    { id: 'abschluss', title: 'Fraktur-Check', unit: 4, icon: '🏆', refs: ['system', 'acr', 'wrist'],
      intro: 'Verbinde deine Suchroutine mit Bildbefunden und ihren Grenzen. Du wiederholst die Trainingsfälle; das ist ein Lerncheck, keine Prüfung an unbekannten Fällen.',
      tip: 'Systematisch ansehen. Klar beschreiben. Grenzen mitdenken.',
      teaching: [
        explain('1. Die Suchroutine wiederholen', 'Prüfe zuerst Bild und Seite, dann die Achsstellung, danach die Knochenkonturen und zuletzt Gelenke und Weichteile. Führe den Ablauf auch nach einem ersten Frakturfund vollständig zu Ende.', ['reading-order']),
        explain('2. Die Tibia-Fraktur erkennen', 'Die Tibia ist der breite Unterschenkelknochen. Folge ihren Rändern, bis die helle Kontur unterbrochen ist. Vergleiche dort die Knochenenden und prüfe anschließend auch die schmalere Fibula.', ['tibia-spot']),
        explain('3. Einen vollständigen Befund formulieren', 'Nenne Knochen und Lokalisation, Verlauf der Frakturlinie, Stellung der Fragmente und eine erkennbare Gelenkbeteiligung. Ergänze Begleitbefunde und Bildgrenzen. Der Name eines Bruchtyps allein ersetzt diese Beschreibung nicht.', ['final-report']),
        explain('4. Den klinischen Verdacht ernst nehmen', 'Bei weiter begründetem Frakturverdacht am Handgelenk reicht ein unauffälliges Erstbild nicht zur Entwarnung. Die weitere klinische Abklärung kann je nach Situation zusätzliche Bildgebung oder Kontrollaufnahmen einschließen.', ['occult']),
      ],
      questions: [sequence(), tibiaSpot(), mc('final-report', 'Welche Befundangaben gehören zusammen?', ['Nur der Name eines Bruchtyps', 'Knochen und Ort, Verlauf, Fragmentstellung und Gelenkbeteiligung', 'Nur die Helligkeit des Bildes'], 1, 'Ein nachvollziehbarer Befund beschreibt Ort, Form und Stellung sowie eine erkennbare Gelenkbeteiligung.'), occult()] },
  ];
  // A question can recur in a later lesson, but every stored attempt has its own ID.
  lessons.forEach((lesson) => {
    lesson.questions.forEach((q) => { q.id = lesson.id + '-' + q.id; });
    lesson.teaching.forEach((section) => { section.covers = section.covers.map((id) => lesson.id + '-' + id); });
  });
  const units = [
    { number: 1, title: 'Bilder lesen', desc: 'Orientierung, Suchroutine und normale Anatomie', color: '#7c5cff', dark: '#5c3fd4', light: '#eee9ff' },
    { number: 2, title: 'Frakturen finden', desc: 'Konturen verfolgen und Bruchstellen entdecken', color: '#2f8fff', dark: '#1c6fd4', light: '#eaf4ff' },
    { number: 3, title: 'Befunde beschreiben', desc: 'Bruchform, Versatz und Begleitverletzungen', color: '#12b3a6', dark: '#0a8d83', light: '#e2f7f5' },
    { number: 4, title: 'Deinen Blick festigen', desc: 'Bildvergleich, Grenzen und dein Fraktur-Check', color: '#f0a519', dark: '#be7d08', light: '#fff4d9' },
  ];
  return { version: 1, reviewStatus: 'awaiting-medical-review', lastUpdated: '2026-11-02', sources, media, lessons, units };
});
