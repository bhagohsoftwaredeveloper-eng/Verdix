const electron = require('electron');
console.log('process.versions.electron:', process.versions.electron);
console.log('typeof electron:', typeof electron);
console.log('electron keys:', Object.keys(electron));
try {
  const { app } = electron;
  console.log('app is Packaged:', app.isPackaged);
  app.quit();
} catch (err) {
  console.error(err);
  process.exit(1);
}
