/* Training labels mapped to imported anatomical meshes.
   Bounds and positions come exclusively from the source asset manifest. */
(function (root, factory) {
  const manifest = typeof module === 'object' && module.exports ? require('./asset-manifest.js') : root.ANATOMY_ASSET_MANIFEST;
  const api = factory(manifest);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ANATOMY_CONTENT = api;
})(typeof window !== 'undefined' ? window : globalThis, function (manifest) {
  'use strict';
  const regions = [
    { id: 'all', name: 'Ganzes Skelett', short: 'Gesamt', icon: '◎' },
    { id: 'kopf', name: 'Kopf', short: 'Kopf', icon: '◉' },
    { id: 'wirbelsaeule', name: 'Wirbelsäule', short: 'Wirbelsäule', icon: '┆' },
    { id: 'thorax', name: 'Brustkorb', short: 'Brustkorb', icon: '≋' },
    { id: 'arme', name: 'Schulter, Arme & Hände', short: 'Obere Extremität', icon: '↗' },
    { id: 'beine', name: 'Becken, Beine & Füße', short: 'Untere Extremität', icon: '↙' },
  ];
  const bones = [];
  function add(id, name, latin, region, note = '', side = '') {
    if (!manifest.targets[id]) throw new Error('Missing imported anatomy: ' + id);
    bones.push({ id, name, latin, region, center: manifest.targets[id].center, note, side, number: bones.length + 1 });
  }
  add('frontal', 'Stirnbein', 'Os frontale', 'kopf', 'Bildet die Stirn und einen Teil des Dachs der Augenhöhlen.');
  add('parietal', 'Scheitelbeine', 'Ossa parietalia', 'kopf', 'Die beiden Scheitelbeine werden hier gemeinsam abgefragt.');
  add('occipital', 'Hinterhauptbein', 'Os occipitale', 'kopf', 'Am Hinterkopf. Drehe das Modell, um es zu sehen.');
  add('temporal', 'Schläfenbeine', 'Ossa temporalia', 'kopf', 'Die beiden Schläfenbeine werden hier gemeinsam abgefragt.');
  add('face', 'Übrige Schädelknochen', 'Ossa cranii · Gruppe', 'kopf', 'Gruppe der übrigen Schädelknochen, unter anderem Oberkiefer-, Joch-, Nasen-, Keil- und Siebbein.');
  add('mandible', 'Unterkiefer', 'Mandibula', 'kopf', 'Der bewegliche Knochen des Unterkiefers.');
  for (let i = 1; i <= 7; i++) add('c' + i, i === 1 ? '1. Halswirbel · Atlas' : i === 2 ? '2. Halswirbel · Axis' : i + '. Halswirbel', i === 1 ? 'Atlas · C1' : i === 2 ? 'Axis · C2' : 'Vertebra cervicalis ' + i + ' · C' + i, 'wirbelsaeule', 'Zur Halswirbelsäule gehören sieben Wirbel.');
  for (let i = 1; i <= 12; i++) add('t' + i, i + '. Brustwirbel', 'Vertebra thoracica ' + i + ' · Th' + i, 'wirbelsaeule', 'Die zwölf Brustwirbel tragen die Rippen.');
  for (let i = 1; i <= 5; i++) add('l' + i, i + '. Lendenwirbel', 'Vertebra lumbalis ' + i + ' · L' + i, 'wirbelsaeule', 'Zur Lendenwirbelsäule gehören fünf Wirbel.');
  add('sacrum', 'Kreuzbein', 'Os sacrum', 'wirbelsaeule', 'Besteht beim Erwachsenen aus fünf verschmolzenen Kreuzbeinwirbeln.');
  add('sternum', 'Brustbein', 'Sternum', 'thorax', 'Vorne in der Mitte des Brustkorbs.');
  for (const side of ['r', 'l']) {
    const de = side === 'r' ? 'rechts' : 'links';
    for (let i = 1; i <= 12; i++) {
      add('rib-' + side + i, i + '. Rippe · ' + de, 'Costa ' + i + ' · ' + (side === 'r' ? 'dextra' : 'sinistra'), 'thorax', i <= 7 ? 'Echte Rippe: über eigenen Rippenknorpel mit dem Brustbein verbunden.' : i <= 10 ? 'Falsche Rippe: über den Rippenbogen indirekt mit dem Brustbein verbunden.' : 'Freie Rippe: endet vorne ohne Verbindung zum Brustbein.', side);
    }
    // Laterality is explicit in the German label; keep the Latin headword
    // uninflected rather than applying one adjective to different genders.
    const limb = (key, name, latin, region, note) => add(key + '-' + side, name + ' · ' + de, latin, region, note, side);
    limb('clavicle', 'Schlüsselbein', 'Clavicula', 'arme', 'Verbindet das Brustbein mit dem Schulterblatt.');
    limb('scapula', 'Schulterblatt', 'Scapula', 'arme', 'Flacher Knochen auf der Rückseite des Brustkorbs.');
    limb('humerus', 'Oberarmknochen', 'Humerus', 'arme', 'Liegt zwischen Schulter und Ellenbogen.');
    limb('radius', 'Speiche', 'Radius', 'arme', 'Liegt in anatomischer Grundstellung auf der Daumenseite.');
    limb('ulna', 'Elle', 'Ulna', 'arme', 'Liegt auf der Kleinfingerseite des Unterarms.');
    limb('carpals', 'Handwurzelknochen', 'Ossa carpi', 'arme', 'Die Handwurzel hat acht Knochen. Im importierten Modell sind sieben dargestellt; das Dreiecksbein (Os triquetrum) fehlt.');
    limb('metacarpals', 'Mittelhandknochen', 'Ossa metacarpi', 'arme', 'Gruppe aus fünf Knochen pro Hand.');
    limb('hand-phalanges', 'Fingerknochen', 'Phalanges manus', 'arme', '14 Knochen pro Hand; der Daumen hat zwei Glieder, die übrigen Finger je drei.');
    limb('hip', 'Hüftbein', 'Os coxae', 'beine', 'Besteht aus Darmbein, Sitzbein und Schambein.');
    limb('femur', 'Oberschenkelknochen', 'Femur', 'beine', 'Verbindet das Hüftgelenk mit dem Kniegelenk.');
    limb('patella', 'Kniescheibe', 'Patella', 'beine', 'Liegt vorne am Kniegelenk.');
    limb('tibia', 'Schienbein', 'Tibia', 'beine', 'Der kräftige, medial gelegene Unterschenkelknochen.');
    limb('fibula', 'Wadenbein', 'Fibula', 'beine', 'Der schlanke, lateral gelegene Unterschenkelknochen.');
    limb('tarsals', 'Fußwurzelknochen', 'Ossa tarsi', 'beine', 'Gruppe aus sieben Knochen pro Fuß, einschließlich Sprung- und Fersenbein.');
    limb('metatarsals', 'Mittelfußknochen', 'Ossa metatarsi', 'beine', 'Gruppe aus fünf Knochen pro Fuß.');
    limb('foot-phalanges', 'Zehenknochen', 'Phalanges pedis', 'beine', '14 Knochen pro Fuß; die Großzehe hat zwei Glieder, die übrigen Zehen je drei.');
  }
  const sources = [
    ['Skelett: Aufbau und Einteilung', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-1-divisions-of-the-skeletal-system'],
    ['Schädel', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull'],
    ['Wirbelsäule', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-3-the-vertebral-column'],
    ['Brustkorb', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-4-the-thoracic-cage'],
    ['Schultergürtel', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-1-the-pectoral-girdle'],
    ['Obere Extremität', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-2-bones-of-the-upper-limb'],
    ['Beckengürtel', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-3-the-pelvic-girdle-and-pelvis'],
    ['Untere Extremität', 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-4-bones-of-the-lower-limb'],
  ];
  return { regions, bones, sources, model: manifest, version: 1 };
});
