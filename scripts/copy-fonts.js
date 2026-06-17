const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'node_modules', '@fontsource', 'inter', 'files');
const dest = path.join(__dirname, '..', 'public', 'fonts');

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const weights = [400, 500, 600, 700];
for (const w of weights) {
  const name = `inter-latin-${w}-normal.woff2`;
  fs.copyFileSync(path.join(src, name), path.join(dest, name));
  console.log(`copied ${name}`);
}
