import fs from 'fs';
import path from 'path';

/**
 * Resolves a single unified `data` directory on the Server PC so that
 * whether `server.cjs` is executed from the project root, `AnbarMeh-Windows-Setup`,
 * or `src-tauri/target/release`, all processes share the exact same central database.
 */
export function resolveCentralDataDir(): string {
  if (process.env.DATA_DIR) {
    return path.resolve(process.env.DATA_DIR);
  }

  const cwd = process.cwd();
  const scriptDir = typeof __dirname !== 'undefined' ? __dirname : cwd;

  // Candidate project roots that already have package.json + data/
  const rootCandidates = [
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '..', '..', '..'),
    path.resolve(scriptDir, '..'),
    path.resolve(scriptDir, '..', '..'),
    path.resolve(scriptDir, '..', '..', '..', '..'),
  ];

  for (const candidate of rootCandidates) {
    try {
      if (
        fs.existsSync(path.join(candidate, 'package.json')) &&
        fs.existsSync(path.join(candidate, 'src-tauri'))
      ) {
        const unifiedData = path.join(candidate, 'data');
        if (!fs.existsSync(unifiedData)) {
          fs.mkdirSync(unifiedData, { recursive: true });
        }
        return unifiedData;
      }
    } catch {}
  }

  const fallback = path.resolve(cwd, 'data');
  try {
    if (!fs.existsSync(fallback)) {
      fs.mkdirSync(fallback, { recursive: true });
    }
  } catch {}
  return fallback;
}
