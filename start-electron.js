const { spawn } = require('child_process');
const path = require('path');

// When run in environments like VS Code's integrated terminal, 
// ELECTRON_RUN_AS_NODE might be set, which causes electron to behave like a standard node process.
// We delete it here so the actual Electron binary app launches correctly.
delete process.env.ELECTRON_RUN_AS_NODE;

try {
  // require('electron') returns the path to the electron executable
  const electronPath = require('electron');

  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('close', (code) => {
    process.exit(code);
  });
} catch (err) {
  console.error("Failed to start Electron:", err);
  process.exit(1);
}
