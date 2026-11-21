// Repo hygiene check for StudyTrack. Run with: npm run check:repo
// Fails (exit code 1) if the repo tracks files it shouldn't, or if a file
// still contains Git merge-conflict markers.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = execSync('git rev-parse --show-toplevel').toString().trim();
const trackedFiles = execSync('git ls-files', { cwd: repoRoot })
  .toString()
  .split('\n')
  .filter(Boolean);

// Files that must never be committed: OS junk, secrets, installed packages.
const forbidden = [
  { test: (f) => path.basename(f) === '.DS_Store', reason: 'macOS system file' },
  { test: (f) => path.basename(f) === 'Thumbs.db', reason: 'Windows system file' },
  { test: (f) => /(^|\/)\.env(\.test)?$/.test(f), reason: 'secrets file (use .env.example)' },
  { test: (f) => f.split('/').includes('node_modules'), reason: 'installed package (run npm install)' },
];

// A line that is exactly a conflict marker, so normal text with "=====" is not flagged.
const conflictMarker = /^(<{7}|={7}|>{7})( .*)?$/;
const textExtensions = ['.js', '.json', '.sql', '.md', '.txt', '.hbs', '.html', '.css', '.yaml', '.yml'];

const problems = [];

for (const file of trackedFiles) {
  const rule = forbidden.find((r) => r.test(file));
  if (rule) problems.push(`${file}: ${rule.reason}`);

  if (!textExtensions.includes(path.extname(file))) continue;
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) continue; // deleted but not yet committed

  const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (conflictMarker.test(line)) problems.push(`${file}:${i + 1}: merge-conflict marker`);
  });
}

if (problems.length > 0) {
  console.error(`Repo check failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
  problems.forEach((p) => console.error(`  - ${p}`));
  process.exit(1);
}

console.log(`Repo check passed: ${trackedFiles.length} tracked files, no problems found.`);