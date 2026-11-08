#!/usr/bin/env python3
"""Extract existing Écorché anatomical meshes; never generate bone geometry.

Usage: python3 scripts/import-anatomy.py /path/to/ecorche.glb
The source is pinned by SHA-256. Geometry attributes and triangle indices are
copied byte-for-byte; only selection, target metadata and scene framing change.
"""
import base64
import copy
import hashlib
import json
from pathlib import Path
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
COMMIT = '320805e06aee51e2e6f6b22533eb2a59d43f2d4d'
SOURCE_URL = f'https://raw.githubusercontent.com/Charleeh/ecorche/{COMMIT}/model/ecorche.glb'
ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']


def target_for(meta):
    name = meta['name'].lower()
    if meta.get('layer') != 'skeleton' or meta.get('tissue') == 'eye' or name == 'external ear':
        return None
    if meta.get('tissue') == 'tooth':
        return 'mandible' if 'lower' in name else 'face'
    if any(word in name for word in ('nasal', 'alar')) and meta.get('tissue') == 'cartilage':
        return 'face'
    if name.startswith('intervertebral disk of '):
        name = name.removeprefix('intervertebral disk of ')
    single = {'atlas': 'c1', 'axis': 'c2', 'frontal bone': 'frontal', 'occipital bone': 'occipital', 'mandible': 'mandible', 'sacrum': 'sacrum', 'body of sternum': 'sternum', 'manubrium': 'sternum', 'xiphoid process': 'sternum', 'ethmoid': 'face', 'sphenoid bone': 'face', 'vomer': 'face'}
    if name in single:
        return single[name]
    for i, ordinal in enumerate(ORDINALS, 1):
        for part, prefix in [('cervical', 'c'), ('thoracic', 't'), ('lumbar', 'l')]:
            if name == f'{ordinal} {part} vertebra':
                return prefix + str(i)
    side = 'l' if meta.get('side') == 'left' else 'r'
    for i, ordinal in enumerate(ORDINALS, 1):
        if name in (f'left {ordinal} rib', f'right {ordinal} rib', f'left {ordinal} costal cartilage', f'right {ordinal} costal cartilage'):
            return f'rib-{side}{i}'
    for token, key in [('clavicle', 'clavicle'), ('scapula', 'scapula'), ('humerus', 'humerus'), ('radius', 'radius'), ('ulna', 'ulna'), ('hip bone', 'hip'), ('femur', 'femur'), ('patella', 'patella'), ('tibia', 'tibia'), ('fibula', 'fibula')]:
        if name in ('left ' + token, 'right ' + token):
            return f'{key}-{side}'
    if 'parietal bone' in name:
        return 'parietal'
    if 'temporal bone' in name:
        return 'temporal'
    if any(word in name for word in ('maxilla', 'zygomatic', 'nasal bone', 'lacrimal', 'palatine', 'inferior nasal concha')):
        return 'face'
    if 'metacarpal' in name:
        return 'metacarpals-' + side
    if 'metatarsal' in name:
        return 'metatarsals-' + side
    if 'phalanx' in name:
        return ('foot-phalanges-' if 'toe' in name else 'hand-phalanges-') + side
    if any(word in name for word in ('scaphoid', 'lunate', 'triquetr', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate')):
        return 'carpals-' + side
    if any(word in name for word in ('talus', 'calcaneus', 'navicular', 'cuboid', 'cuneiform')):
        return 'tarsals-' + side
    raise ValueError('Unmapped skeleton structure: ' + meta['name'])


def main():
    source = Path(sys.argv[1]).read_bytes()
    source_sha = hashlib.sha256(source).hexdigest()
    expected_sha = '9744d3dffced835961104447d23a781ad469588289ce322d84d000e0d498326c'
    if source_sha != expected_sha:
        raise ValueError('Unexpected source bytes: ' + source_sha)
    magic, version, size = struct.unpack_from('<III', source)
    assert magic == 0x46546c67 and version == 2 and size == len(source)
    json_size, _ = struct.unpack_from('<II', source, 12)
    original = json.loads(source[20:20 + json_size])
    bin_offset = 20 + json_size + 8
    output = {key: copy.deepcopy(original[key]) for key in ('asset', 'extensionsUsed', 'extensionsRequired') if key in original}
    output['asset']['generator'] = 'Écorché skeleton subset; source vertex/index buffers unchanged'
    output.update(nodes=[], meshes=[], accessors=[], bufferViews=[], materials=[copy.deepcopy(original['materials'][0])])
    binary = bytearray()
    targets = {}
    bone_count = 0
    for node in original['nodes']:
        if 'mesh' not in node:
            continue
        meta = node.get('extras', {})
        target = target_for(meta)
        if target is None:
            continue
        mesh = copy.deepcopy(original['meshes'][node['mesh']])
        info = targets.setdefault(target, {'names': [], 'sourceBounds': [[float('inf')] * 3, [float('-inf')] * 3], 'vertices': 0, 'triangles': 0})
        info['names'].append(meta['name'])
        bone_count += meta['tissue'] == 'bone'
        for primitive in mesh['primitives']:
            primitive['material'] = 0
            attributes = primitive['attributes']
            for attr in list(attributes) + ['indices']:
                old_index = primitive['indices'] if attr == 'indices' else attributes[attr]
                accessor = copy.deepcopy(original['accessors'][old_index])
                view = copy.deepcopy(original['bufferViews'][accessor['bufferView']])
                data = source[bin_offset + view.get('byteOffset', 0):bin_offset + view.get('byteOffset', 0) + view['byteLength']]
                # Keep every source attribute/index byte; do not retopologize.
                while len(binary) % 4:
                    binary.append(0)
                view['byteOffset'] = len(binary)
                view['buffer'] = 0
                binary.extend(data)
                accessor['bufferView'] = len(output['bufferViews'])
                new_index = len(output['accessors'])
                output['bufferViews'].append(view)
                output['accessors'].append(accessor)
                if attr == 'indices':
                    primitive['indices'] = new_index
                    info['triangles'] += accessor['count'] // 3
                else:
                    attributes[attr] = new_index
                if attr == 'POSITION':
                    info['vertices'] += accessor['count']
                    for axis in range(3):
                        info['sourceBounds'][0][axis] = min(info['sourceBounds'][0][axis], accessor['min'][axis])
                        info['sourceBounds'][1][axis] = max(info['sourceBounds'][1][axis], accessor['max'][axis])
        output['nodes'].append({'name': node['name'], 'mesh': len(output['meshes']), 'extras': {**meta, 'targetId': target}})
        output['meshes'].append(mesh)
    total_min = [min(t['sourceBounds'][0][a] for t in targets.values()) for a in range(3)]
    total_max = [max(t['sourceBounds'][1][a] for t in targets.values()) for a in range(3)]
    translation = [-(lo + hi) / 2 * .001 for lo, hi in zip(total_min, total_max)]
    root = {'name': 'BodyParts3D skeleton via Ecorche', 'scale': [.001] * 3, 'translation': translation, 'children': list(range(len(output['nodes'])))}
    root_index = len(output['nodes'])
    output['nodes'].append(root)
    output.update(scenes=[{'nodes': [root_index]}], scene=0, buffers=[{'byteLength': len(binary)}])
    json_bytes = json.dumps(output, separators=(',', ':')).encode()
    json_bytes += b' ' * (-len(json_bytes) % 4)
    binary += b'\0' * (-len(binary) % 4)
    asset = struct.pack('<III', magic, 2, 12 + 8 + len(json_bytes) + 8 + len(binary)) + struct.pack('<II', len(json_bytes), 0x4e4f534a) + json_bytes + struct.pack('<II', len(binary), 0x004e4942) + binary
    media = ROOT / 'assets/media/anatomy'
    media.mkdir(parents=True, exist_ok=True)
    (media / 'skeleton.glb').write_bytes(asset)
    (media / 'skeleton-data.js').write_text('/* Same imported GLB, embedded for file:// previews. CC BY-SA 4.0; see ATTRIBUTION.md. */\nwindow.ANATOMY_GLB_BASE64=' + json.dumps(base64.b64encode(asset).decode()) + ';\n')
    for t in targets.values():
        t['bounds'] = [[round(value * .001 + translation[a], 6) for a, value in enumerate(row)] for row in t.pop('sourceBounds')]
        t['center'] = [round((lo + hi) / 2, 6) for lo, hi in zip(*t['bounds'])]
    manifest = {'version': 1, 'source': SOURCE_URL, 'sourceCommit': COMMIT, 'sourceSha256': source_sha, 'assetSha256': hashlib.sha256(asset).hexdigest(), 'license': 'CC BY-SA 4.0', 'boneMeshCount': bone_count, 'meshCount': len(output['meshes']), 'targets': targets, 'missing': ['Coccyx', 'Hyoid', 'Auditory ossicles', 'Triquetral bones']}
    wrapper = '(function(root,data){if(typeof module==="object"&&module.exports)module.exports=data;else root.ANATOMY_ASSET_MANIFEST=data;})(typeof window!=="undefined"?window:globalThis,'
    (ROOT / 'assets/js/anatomy/asset-manifest.js').write_text('/* Imported model inventory; CC BY-SA 4.0, see assets/media/anatomy/ATTRIBUTION.md. */\n' + wrapper + json.dumps(manifest, separators=(',', ':')) + ');\n')
    print(f'Imported {bone_count} bone meshes, {len(output["meshes"])} meshes total, {len(targets)} training targets; {len(asset):,} GLB bytes')


if __name__ == '__main__':
    main()
