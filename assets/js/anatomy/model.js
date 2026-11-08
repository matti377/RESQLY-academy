/* Imported Écorché / BodyParts3D meshes, CC BY-SA 4.0.
   No procedural anatomy: rendering, raycasting and target visibility only. */
(function (root) {
  'use strict';
  function create(container, content, onSelect, onReady) {
    const T = root.THREE;
    const groups = new Map(), meshes = [], geometries = new Set(), materials = new Set();
    let renderer, destroyed = false, frame = 0, activeRegion = 'all', selected = null, highlighted = null;
    let active = new Set(content.bones.map(b => b.id)), hidden = new Set(), hover = null;
    const scene = new T.Scene();
    const skeleton = new T.Group(); scene.add(skeleton);
    const camera = new T.PerspectiveCamera(34, 1, .1, 120);
    const center = new T.Vector3(0, -.1, 0);
    let yaw = -.12, pitch = .03, distance = 35;
    const raycaster = new T.Raycaster(), pointer = new T.Vector2();
    const color = { normal: 0xffffff, selected: 0x5de0cb, hover: 0xa4ede1, muted: 0x576779, correct: 0x66e2a0, wrong: 0xff8a87 };
    let feedback = null;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Drehbares 3D-Skelett. Knochen anklicken; mit Pfeiltasten drehen und mit Plus oder Minus zoomen. Alternative Auswahl unter dem Modell.');
    canvas.tabIndex = 0;
    container.append(canvas);
    const status = document.createElement('span'); status.className = 'an-render-status'; status.textContent = '3D · INTERAKTIV'; container.append(status);
    for (const b of content.bones) {
      const group = new T.Group(); group.userData.id = b.id; group.userData.bone = b;
      const material = new T.MeshStandardMaterial({ color: color.normal, roughness: .64, metalness: 0, vertexColors: true, side: T.DoubleSide });
      materials.add(material); group.userData.material = material;
      groups.set(b.id, group); skeleton.add(group);
    }
    for (const part of importedParts) {
      const group = groups.get(part.id);
      if (!group) throw new Error('Unmapped imported mesh: ' + part.metadata.name);
      const geometry = part.geometry.clone(); geometries.add(geometry);
      const mesh = new T.Mesh(geometry, group.userData.material);
      mesh.userData = { ...part.metadata, id: part.id };
      group.add(mesh); meshes.push(mesh);
    }
    container.dataset.modelSource = 'ecorche-bodyparts3d';
    container.dataset.meshCount = String(meshes.length);
    scene.add(new T.HemisphereLight(0xe9f7ff, 0x333b46, 2));
    const key = new T.DirectionalLight(0xfff2d8, 3); key.position.set(-5, 9, 12); scene.add(key);
    const rim = new T.DirectionalLight(0x76d8df, 2.5); rim.position.set(5, 3, -8); scene.add(rim);
    function updateCamera() {
      camera.position.set(center.x + distance * Math.sin(yaw) * Math.cos(pitch), center.y + distance * Math.sin(pitch), center.z + distance * Math.cos(yaw) * Math.cos(pitch));
      camera.lookAt(center); camera.updateMatrixWorld();
    }
    function render() {
      frame = 0;
      if (destroyed || !renderer) return;
      updateCamera(); renderer.render(scene, camera);
    }
    function invalidate() { if (!frame && !destroyed) frame = requestAnimationFrame(render); }
    function paint() {
      for (const [id, group] of groups) {
        group.visible = !hidden.has(id);
        const m = group.userData.material, enabled = active.has(id);
        let c = enabled ? color.normal : color.muted;
        if (id === selected || id === highlighted) c = color.selected;
        if (id === hover && enabled && !selected) c = color.hover;
        if (feedback?.target === id) c = color.correct;
        if (feedback && !feedback.ok && feedback.chosen === id) c = color.wrong;
        m.color.setHex(c); m.emissive.setHex(c === color.normal || c === color.muted ? 0 : c); m.emissiveIntensity = .17;
        m.transparent = !enabled; m.opacity = enabled ? 1 : .13; m.depthWrite = enabled;
      }
      invalidate();
      if (!renderer) fallbackPaint();
    }
    function fit() {
      const box = new T.Box3();
      for (const [id, group] of groups) {
        if (activeRegion === 'all' || group.userData.bone.region === activeRegion) {
          // Include hidden targets so framing stays stable throughout a round.
          for (const mesh of group.children) box.union(mesh.geometry.boundingBox);
        }
      }
      const size = box.getSize(new T.Vector3()); box.getCenter(center);
      // Fit real asset bounds, including depth, in portrait and landscape.
      distance = Math.max(size.y / 2, size.x / (2 * camera.aspect)) / Math.tan(camera.fov * Math.PI / 360) * 1.12 + size.z / 2;
      invalidate();
    }
    function resize() {
      if (destroyed) return;
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
      renderer?.setSize(w, h, false); fit();
    }
    const events = new AbortController();
    const listen = (element, event, fn, options = {}) => element.addEventListener(event, fn, { ...options, signal: events.signal });
    let fallback = null;
    // Without WebGL, project the imported triangles themselves into SVG.
    // This is the same anatomical asset, never a replacement made of shapes.
    function fallbackPaint() {
      if (!fallback) return;
      for (const node of fallback.querySelectorAll('[data-bone]')) {
        const id = node.dataset.bone;
        node.style.display = hidden.has(id) ? 'none' : '';
        node.setAttribute('opacity', active.has(id) ? '1' : '.13');
        let fill = id === selected || id === highlighted || id === hover ? '#5de0cb' : '#e2dfd0';
        if (feedback?.target === id) fill = '#66e2a0';
        if (feedback && !feedback.ok && feedback.chosen === id) fill = '#ff8a87';
        node.setAttribute('fill', fill);
      }
    }
    function makeFallback() {
      canvas.hidden = true; status.textContent = '2D · WEBGL NICHT VERFÜGBAR';
      const ns = 'http://www.w3.org/2000/svg';
      fallback = document.createElementNS(ns, 'svg');
      fallback.setAttribute('viewBox', '-5 -10 10 20'); fallback.classList.add('an-fallback');
      fallback.setAttribute('aria-label', 'Frontprojektion des importierten anatomischen Skeletts. Alternative Auswahl über die nummerierte Liste.');
      const sorted = meshes.slice().sort((a, b) => a.geometry.boundingBox.getCenter(new T.Vector3()).z - b.geometry.boundingBox.getCenter(new T.Vector3()).z);
      for (const mesh of sorted) {
        const position = mesh.geometry.attributes.position, index = mesh.geometry.index;
        let d = '';
        for (let i = 0; i < index.count; i += 3) {
          const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
          const ax = position.getX(a), ay = position.getY(a), bx = position.getX(b), by = position.getY(b), cx = position.getX(c), cy = position.getY(c);
          if ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax) <= 0) continue;
          d += 'M' + ax.toFixed(3) + ',' + (-ay).toFixed(3) + 'L' + bx.toFixed(3) + ',' + (-by).toFixed(3) + 'L' + cx.toFixed(3) + ',' + (-cy).toFixed(3) + 'Z';
        }
        const path = document.createElementNS(ns, 'path'); path.setAttribute('d', d); path.dataset.bone = mesh.userData.id; path.style.cursor = 'pointer';
        listen(path, 'click', () => { if (active.has(mesh.userData.id) && !hidden.has(mesh.userData.id)) onSelect(mesh.userData.id); });
        fallback.append(path);
      }
      container.append(fallback); fallbackPaint();
    }
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    } catch (_) { makeFallback(); }
    function hit(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      updateCamera(); skeleton.updateMatrixWorld(true); raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(meshes, false).find(hit => active.has(hit.object.userData.id) && !hidden.has(hit.object.userData.id))?.object.userData.id || null;
    }
    const pointers = new Map(); let drag = null, pinch = null;
    listen(canvas, 'pointerdown', e => {
      if (e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw, pitch, moved: false };
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { gap: Math.hypot(a[0] - b[0], a[1] - b[1]), distance }; }
    });
    listen(canvas, 'pointermove', e => {
      if (!pointers.has(e.pointerId)) {
        const next = hit(e); if (hover !== next) { hover = next; canvas.style.cursor = next ? 'pointer' : 'grab'; paint(); } return;
      }
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; distance = Math.max(3, Math.min(70, pinch.distance * pinch.gap / Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])))); drag.moved = true; invalidate(); return; }
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) { yaw = drag.yaw - dx * .009; pitch = Math.max(-1.15, Math.min(1.15, drag.pitch + dy * .007)); hover = null; invalidate(); }
    });
    listen(canvas, 'pointerup', e => {
      const clicked = drag && !drag.moved && pointers.size === 1;
      pointers.delete(e.pointerId); pinch = null;
      if (clicked) { const id = hit(e); if (id) onSelect(id); }
      drag = null;
    });
    listen(canvas, 'pointercancel', e => { pointers.delete(e.pointerId); pinch = null; drag = null; });
    listen(canvas, 'pointerleave', () => { hover = null; paint(); });
    listen(canvas, 'wheel', e => { e.preventDefault(); distance = Math.max(3, Math.min(70, distance * (e.deltaY > 0 ? 1.08 : .92))); invalidate(); }, { passive: false });
    listen(canvas, 'keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') yaw -= .15;
      if (e.key === 'ArrowRight') yaw += .15;
      if (e.key === 'ArrowUp') pitch = Math.min(1.15, pitch + .12);
      if (e.key === 'ArrowDown') pitch = Math.max(-1.15, pitch - .12);
      if (e.key === '+' || e.key === '=') distance = Math.max(3, distance * .85);
      if (e.key === '-') distance = Math.min(70, distance / .85);
      if (e.key === 'Home') { yaw = 0; pitch = 0; fit(); }
      invalidate();
    });
    listen(canvas, 'webglcontextlost', e => {
      e.preventDefault(); status.textContent = '3D pausiert · Ansicht zurücksetzen oder Seite neu laden';
    });
    listen(canvas, 'webglcontextrestored', () => { status.textContent = '3D · INTERAKTIV'; invalidate(); });
    const observer = new ResizeObserver(resize); observer.observe(container);
    resize(); paint();
    const api = {
      is3D: !!renderer,
      setState(options) {
        if (options.active) active = new Set(options.active);
        if (options.hidden) hidden = new Set(options.hidden);
        selected = options.selected || null; feedback = options.feedback || null; paint();
      },
      focusRegion(id) { activeRegion = id; yaw = id === 'wirbelsaeule' ? Math.PI : -.12; pitch = .03; fit(); },
      highlight(id) { highlighted = id; paint(); },
      view(name) { yaw = name === 'back' ? Math.PI : name === 'side' ? Math.PI / 2 : 0; pitch = 0; invalidate(); },
      zoom(factor) { distance = Math.max(3, Math.min(70, distance * factor)); invalidate(); },
      reset() { yaw = activeRegion === 'wirbelsaeule' ? Math.PI : -.12; pitch = .03; fit(); },
      // Useful for positioning DOM labels and for verification of real ray hits.
      project(id) {
        const group = groups.get(id); if (!group) return null;
        const box = new T.Box3(); for (const mesh of group.children) box.union(mesh.geometry.boundingBox);
        updateCamera(); const p = box.getCenter(new T.Vector3()).project(camera);
        return { x: (p.x + 1) / 2 * container.clientWidth, y: (1 - p.y) / 2 * container.clientHeight };
      },
      destroy() {
        destroyed = true; cancelAnimationFrame(frame); observer.disconnect(); events.abort();
        geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); renderer?.dispose();
        canvas.remove(); fallback?.remove(); status.remove(); meshes.length = 0; groups.clear();
      },
    };
    onReady?.(api); return api;
  }
  let importedParts = null;
  async function loadAsset() {
    let bytes;
    if (location.protocol === 'file:') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = resqlyAssetRoot + 'assets/media/anatomy/skeleton-data.js?v=1';
        script.onload = resolve; script.onerror = reject; document.head.append(script);
      });
      const decoded = atob(root.ANATOMY_GLB_BASE64);
      bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
      bytes = bytes.buffer; delete root.ANATOMY_GLB_BASE64;
    } else {
      const response = await fetch(resqlyAssetRoot + 'assets/media/anatomy/skeleton.glb?v=' + ANATOMY_ASSET_MANIFEST.assetSha256.slice(0, 12));
      if (!response.ok) throw new Error('Model download failed: HTTP ' + response.status);
      bytes = await response.arrayBuffer();
    }
    const gltf = await new Promise((resolve, reject) => new AnatomyGLTF.GLTFLoader().parse(bytes, '', resolve, reject));
    const parts = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(node => {
      if (!node.isMesh) return;
      if (!node.userData.targetId || !ANATOMY_ASSET_MANIFEST.targets[node.userData.targetId]) throw new Error('Invalid anatomical mesh metadata');
      const geometry = node.geometry.clone();
      // Quantized GLB positions must become floats before world transforms.
      for (const name of ['position', 'normal']) {
        const a = geometry.attributes[name];
        const data = new Float32Array(a.count * 3);
        for (let i = 0; i < a.count; i++) { data[i * 3] = a.getX(i); data[i * 3 + 1] = a.getY(i); data[i * 3 + 2] = a.getZ(i); }
        geometry.setAttribute(name, new THREE.BufferAttribute(data, 3));
      }
      geometry.applyMatrix4(node.matrixWorld); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      parts.push({ id: node.userData.targetId, metadata: { ...node.userData }, geometry });
      node.geometry.dispose();
    });
    const expected = Object.keys(ANATOMY_ASSET_MANIFEST.targets);
    if (parts.length !== ANATOMY_ASSET_MANIFEST.meshCount || expected.some(id => !parts.some(p => p.id === id))) throw new Error('Incomplete anatomical asset');
    importedParts = parts;
  }
  root.AnatomyModel = { create, ready: loadAsset() };
})(window);
