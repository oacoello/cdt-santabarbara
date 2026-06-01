const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const platformTarget = {
  win32: 'win',
  linux: 'linux',
};

const targetBinary = {
  win: path.join(root, 'HP71', 'dist', 'win', 'hp71_emulator.exe'),
  linux: path.join(root, 'HP71', 'dist', 'linux', 'hp71_emulator'),
};

function normalizeTargets(args) {
  const requested = args.length > 0 ? args : ['current'];
  return requested.flatMap((target) => {
    if (target === 'current') {
      const current = platformTarget[process.platform];
      if (!current) {
        throw new Error(`Unsupported packaging platform: ${process.platform}`);
      }
      return [current];
    }

    return [target];
  });
}

function assertExists(filePath, message) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${message}: ${filePath}`);
  }
}

function assertNativeTargetMatchesHost(target) {
  const current = platformTarget[process.platform];
  if (target !== current) {
    throw new Error(
      `Refusing to package ${target} from ${process.platform}. This app ships native modules ` +
      `(bcrypt / better-sqlite3 / Prisma) and HP71 sidecar binaries, so build each installer on its target OS.`
    );
  }
}

function check(target) {
  assertNativeTargetMatchesHost(target);
  assertExists(
    path.join(root, '.next', 'standalone', 'server.js'),
    'Missing Next standalone server'
  );
  assertExists(
    path.join(root, '.next', 'standalone', '.next', 'static'),
    'Missing copied Next static assets'
  );
  assertExists(
    path.join(root, 'assets', 'splash_cdt.gif'),
    'Missing startup splash GIF'
  );
  assertExists(targetBinary[target], `Missing HP71 ${target} binary`);
}

try {
  const targets = normalizeTargets(process.argv.slice(2));
  targets.forEach(check);
  console.log(`Electron package assets OK for: ${targets.join(', ')}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
