const fs = require('fs');
const path = require('path');
const { stageHp71Binary } = require('./prepare-hp71-binary');

const root = path.resolve(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');

function copyDir(source, target) {
  if (!fs.existsSync(source)) return;

  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true, force: true });
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error('Missing .next/standalone. Run `next build` before preparing Electron assets.');
}

copyDir(path.join(root, '.next', 'static'), path.join(standaloneNextDir, 'static'));
copyDir(path.join(root, 'public'), path.join(standaloneDir, 'public'));

stageHp71Binary('win');
stageHp71Binary('linux');
