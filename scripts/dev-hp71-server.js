const { existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const root = join(__dirname, "..");
const hp71BuildDir = join(root, "HP71", "build");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function findVisualStudioDevCmd() {
  const vswhere = join(
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    "Microsoft Visual Studio",
    "Installer",
    "vswhere.exe",
  );

  if (!existsSync(vswhere)) {
    return null;
  }

  const result = spawnSync(
    vswhere,
    [
      "-latest",
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ],
    { encoding: "utf8" },
  );

  const installPath = result.stdout.trim();
  if (!installPath) {
    return null;
  }

  const devCmd = join(installPath, "Common7", "Tools", "VsDevCmd.bat");
  return existsSync(devCmd) ? devCmd : null;
}

function clearBrokenCMakeCache() {
  rmSync(join(hp71BuildDir, "CMakeCache.txt"), { force: true });
  rmSync(join(hp71BuildDir, "CMakeFiles"), { recursive: true, force: true });
}

function runWindowsBuild() {
  const devCmd = findVisualStudioDevCmd();

  if (!devCmd) {
    console.error(
      "No se encontró Visual Studio con 'Desktop development with C++'. " +
        "Instalá ese workload desde Visual Studio Installer.",
    );
    process.exit(1);
  }

  clearBrokenCMakeCache();

  mkdirSync(hp71BuildDir, { recursive: true });

  const commandPath = join(hp71BuildDir, "dev-hp71-server.cmd");
  writeFileSync(
    commandPath,
    [
      "@echo off",
      `call "${devCmd}" -arch=x64 -host_arch=x64`,
      'cmake -S HP71 -B HP71\\build -G "NMake Makefiles" -DCMAKE_BUILD_TYPE=Debug',
      "if errorlevel 1 exit /b %errorlevel%",
      "cmake --build HP71\\build --config Debug --target hp71_emulator",
      "if errorlevel 1 exit /b %errorlevel%",
      'if exist "HP71\\build\\hp71_server\\Debug\\hp71_emulator.exe" (',
      '  start "" /D HP71 /B build\\hp71_server\\Debug\\hp71_emulator.exe',
      ") else (",
      '  start "" /D HP71 /B build\\hp71_server\\hp71_emulator.exe',
      ")",
      "",
    ].join("\r\n"),
  );

  run("cmd.exe", ["/d", "/c", commandPath]);
}

function runUnixBuild() {
  run("cmake", ["-S", "HP71", "-B", "HP71/build", "-DCMAKE_BUILD_TYPE=Debug"]);
  run("cmake", ["--build", "HP71/build", "--target", "hp71_emulator"]);
  run(join(root, "HP71", "build", "hp71_server", "hp71_emulator"), [], {
    cwd: join(root, "HP71"),
    detached: true,
    stdio: "ignore",
  });
}

if (process.platform === "win32") {
  runWindowsBuild();
} else {
  runUnixBuild();
}
