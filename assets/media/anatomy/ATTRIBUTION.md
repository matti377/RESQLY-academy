# Anatomical skeleton asset

**Écorché** — https://github.com/Charleeh/ecorche — **CC BY-SA 4.0**.
Based on **BodyParts3D**, © The Database Center for Life Science, **CC BY 4.0**,
and **Z-Anatomy** by Gauthier Kervyn, **CC BY-SA 4.0**.

Source commit: `320805e06aee51e2e6f6b22533eb2a59d43f2d4d`.
Source file: [model/ecorche.glb](https://github.com/Charleeh/ecorche/blob/320805e06aee51e2e6f6b22533eb2a59d43f2d4d/model/ecorche.glb).
SHA-256: `9744d3dffced835961104447d23a781ad469588289ce322d84d000e0d498326c`.

The source skeleton meshes are derived from the BodyParts3D anatomical dataset.
The upstream file combines these with Z-Anatomy muscles; this application uses
only its skeleton subset. See [upstream attribution](UPSTREAM-ATTRIBUTION.md)
for source credits and upstream processing, including simplification, coordinate
conversion, normals and baked vertex colours.

## Changes in this project

- Selected the source's 198 named bone meshes, 28 teeth and 41 supporting
  cartilage meshes. Muscles, eyes and external ear cartilage are excluded.
- Copied all selected position, normal, colour and triangle-index buffers
  **byte-for-byte**. No bone shapes were modelled, reconstructed or simplified
  by this project.
- Applied a uniform scene scale and translation to frame the imported model.
- Added IDs linking the imported named meshes to 88 training targets. Some
  targets group several source bones; cartilage and teeth follow their associated
  bone target for selection and visibility. They are not counted as bones.
- Wrote `skeleton.glb`, the adapted model, and a byte-identical base64 embedding
  in `skeleton-data.js` for local `file://` previews.

Reproduce the extraction with `python3 scripts/import-anatomy.py /path/to/ecorche.glb`.
The importer checks the pinned source checksum. Its output inventory and
checksums are recorded in `assets/js/anatomy/asset-manifest.js`.

The adapted model and its embedded copy retain **CC BY-SA 4.0**. The complete
licence is in [CC-BY-SA-4.0.txt](CC-BY-SA-4.0.txt). This licence covers the model
asset and adaptations of it; the surrounding application code is separate.

## Source coverage

The source lacks the coccyx, hyoid, auditory ossicles and both triquetral bones.
They have not been replaced by generated shapes or included as unselectable
quiz targets. The sternum has three source meshes grouped into one target.
