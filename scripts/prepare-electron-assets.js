const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const hp71DistWinDir = path.join(root, 'HP71', 'dist', 'win');
const hp71DistLinuxDir = path.join(root, 'HP71', 'dist', 'linux');

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

fs.mkdirSync(hp71DistWinDir, { recursive: true });
fs.mkdirSync(hp71DistLinuxDir, { recursive: true });

const currentWindowsHp71 = path.join(root, 'HP71', 'build', 'hp71_server', 'Debug', 'hp71_emulator.exe');
const stagedWindowsHp71 = path.join(hp71DistWinDir, 'hp71_emulator.exe');
const currentLinuxHp71 = path.join(root, 'HP71', 'build', 'hp71_server', 'hp71_emulator');
const stagedLinuxHp71 = path.join(hp71DistLinuxDir, 'hp71_emulator');

if (fs.existsSync(currentWindowsHp71) && !fs.existsSync(stagedWindowsHp71)) {
  fs.copyFileSync(currentWindowsHp71, stagedWindowsHp71);
}

if (fs.existsSync(currentLinuxHp71) && !fs.existsSync(stagedLinuxHp71)) {
  fs.copyFileSync(currentLinuxHp71, stagedLinuxHp71);
  fs.chmodSync(stagedLinuxHp71, 0o755);
}
