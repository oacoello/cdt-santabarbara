const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const TARGETS = {
  win: {
    outputName: 'hp71_emulator.exe',
    candidates: [
      path.join(root, 'HP71', 'build', 'hp71_server', 'Release', 'hp71_emulator.exe'),
      path.join(root, 'HP71', 'build', 'hp71_server', 'Debug', 'hp71_emulator.exe'),
      path.join(root, 'HP71', 'build', 'hp71_server', 'hp71_emulator.exe'),
    ],
  },
  linux: {
    outputName: 'hp71_emulator',
    candidates: [
      path.join(root, 'HP71', 'build', 'hp71_server', 'hp71_emulator'),
      path.join(root, 'HP71', 'build', 'hp71_server', 'Release', 'hp71_emulator'),
      path.join(root, 'HP71', 'build', 'hp71_server', 'Debug', 'hp71_emulator'),
    ],
  },
};

function stageHp71Binary(target, options = {}) {
  const config = TARGETS[target];
  if (!config) {
    throw new Error(`Unsupported HP71 target "${target}". Expected one of: ${Object.keys(TARGETS).join(', ')}`);
  }

  const source = config.candidates.find((candidate) => fs.existsSync(candidate));
  const outputDir = path.join(root, 'HP71', 'dist', target);
  const outputPath = path.join(outputDir, config.outputName);

  fs.mkdirSync(outputDir, { recursive: true });

  if (!source) {
    if (options.required) {
      throw new Error(
        `Missing HP71 ${target} binary. Build it first with "npm run build:hp71:${target}".`
      );
    }

    return null;
  }

  fs.copyFileSync(source, outputPath);

  if (target === 'linux') {
    fs.chmodSync(outputPath, 0o755);
  }

  return outputPath;
}

if (require.main === module) {
  const target = process.argv[2];
  const outputPath = stageHp71Binary(target, { required: true });
  console.log(`Staged HP71 ${target} binary: ${outputPath}`);
}

module.exports = { stageHp71Binary };
