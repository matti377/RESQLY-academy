/* Rebuild with temporary development tooling:
   npm install --prefix /tmp/resqly-anatomy-loader three@0.160.1 esbuild@0.25.0
   node scripts/vendor-anatomy-loader.cjs /tmp/resqly-anatomy-loader/node_modules
   Reuses window.THREE rather than bundling a second Three.js runtime. */
const path = require('node:path');
const modules = path.resolve(process.argv[2]);
const esbuild = require(path.join(modules, 'esbuild'));
const three = require(path.join(modules, 'three/build/three.cjs'));
esbuild.build({
  stdin: { contents: 'export { GLTFLoader } from "' + path.join(modules, 'three/examples/jsm/loaders/GLTFLoader.js') + '";', resolveDir: __dirname },
  outfile: path.resolve(__dirname, '../assets/js/vendor/gltf-loader.min.js'),
  bundle: true, format: 'iife', globalName: 'AnatomyGLTF', minify: true,
  banner: { js: '/* Three.js r160 GLTFLoader and BufferGeometryUtils. MIT; see THREE-LICENSE.txt. */' },
  plugins: [{ name: 'shared-three-runtime', setup(build) {
    build.onResolve({ filter: /^three$/ }, () => ({ path: 'shared-three', namespace: 'global-three' }));
    build.onLoad({ filter: /.*/, namespace: 'global-three' }, () => ({ contents: Object.keys(three).map(key => 'export const ' + key + '=window.THREE.' + key + ';').join('\n') }));
  } }],
}).catch(error => { console.error(error); process.exitCode = 1; });
