/**
 * Post-build script: embeds all static frontend files from `dist/` (index.html, assets/*, icons, etc.)
 * as gzip-compressed buffers directly inside `dist/server.cjs`.
 *
 * This guarantees that even when `dist/server.cjs` is copied standalone without `dist/index.html`
 * or `dist/assets/*` (such as inside Tauri `_up_/dist/server.cjs` or `AnbarMeh-Windows-Setup/dist/server.cjs`),
 * any mobile phone or computer on the LAN opening `http://<ServerIP>:<Port>` ALWAYS receives the
 * complete AnbarMeh Enterprise Web Application!
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const distDir = path.resolve(__dirname, '..', 'dist');
const serverCjsPath = path.join(distDir, 'server.cjs');

if (!fs.existsSync(serverCjsPath)) {
  console.error('[EmbedStatic] dist/server.cjs not found, skipping static embedding.');
  process.exit(0);
}

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

function collectFiles(dir, baseDir, out = {}) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      // Skip large user-uploaded chat screenshots in /assets/aistudio if any
      if (relPath.startsWith('/assets/aistudio')) continue;
      collectFiles(fullPath, baseDir, out);
    } else if (entry.isFile()) {
      if (entry.name === 'server.cjs' || entry.name.endsWith('.map')) continue;
      const ext = path.extname(entry.name).toLowerCase();
      const mime = MIME_MAP[ext] || 'application/octet-stream';
      const rawBuf = fs.readFileSync(fullPath);
      const gzBuf = zlib.gzipSync(rawBuf, { level: 9 });
      out[relPath] = {
        mime,
        gz: gzBuf.toString('base64'),
        size: rawBuf.length,
      };
    }
  }
  return out;
}

const embeddedAssets = collectFiles(distDir, distDir);
const assetCount = Object.keys(embeddedAssets).length;

const originalServerCode = fs.readFileSync(serverCjsPath, 'utf-8');
const marker = '// [ANBARMEH_EMBEDDED_STATIC_BUNDLE]';

// Strip previous injection if re-running
const cleanServerCode = originalServerCode.includes(marker)
  ? originalServerCode.slice(originalServerCode.indexOf('// [END_ANBARMEH_EMBEDDED_STATIC_BUNDLE]') + '// [END_ANBARMEH_EMBEDDED_STATIC_BUNDLE]\n'.length)
  : originalServerCode;

const headerInjection = [
  marker,
  `global.__ANBARMEH_EMBEDDED_STATIC__ = ${JSON.stringify(embeddedAssets)};`,
  '// [END_ANBARMEH_EMBEDDED_STATIC_BUNDLE]',
  '',
].join('\n');

fs.writeFileSync(serverCjsPath, headerInjection + cleanServerCode, 'utf-8');
const finalSizeMb = (fs.statSync(serverCjsPath).size / (1024 * 1024)).toFixed(2);
console.log(`[EmbedStatic] Successfully embedded ${assetCount} web app files into dist/server.cjs (Total standalone size: ${finalSizeMb} MB)`);

// Also sync dist/server.cjs into AnbarMeh-Windows-Setup/dist and src-tauri/target/release/_up_/dist if present
const rootDir = path.resolve(__dirname, '..');
const mirrorTargets = [
  path.join(rootDir, 'AnbarMeh-Windows-Setup', 'dist'),
  path.join(rootDir, 'src-tauri', 'target', 'release', '_up_', 'dist'),
  path.join(rootDir, 'src-tauri', 'target', 'release', 'dist'),
];

for (const targetDir of mirrorTargets) {
  try {
    const parentDir = path.dirname(targetDir);
    if (fs.existsSync(parentDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(serverCjsPath, path.join(targetDir, 'server.cjs'));
      console.log(`[EmbedStatic] Synced standalone server.cjs -> ${path.join(targetDir, 'server.cjs')}`);
    }
  } catch (err) {
    // Ignore if locked or unavailable
  }
}
