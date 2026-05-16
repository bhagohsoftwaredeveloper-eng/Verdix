const { spawnSync } = require('child_process');
delete process.env.ELECTRON_RUN_AS_NODE;
const result = spawnSync('npx.cmd', ['electron', 'test-electron.js'], { stdio: 'inherit', env: process.env });
process.exit(result.status || 0);
