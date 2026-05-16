const fs = require('fs');
const path = require('path');

const directories = [
  'app/(app)/pos',
  'app/(app)/settings/pos-setup'
];

function updateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content.replace(
    /printMode:\s*'browser'\s*\|\s*'escpos'\s*\|\s*'usb'/g,
    "printMode: 'browser' | 'escpos' | 'usb' | 'native'"
  );
  
  // In app/(app)/settings/pos-setup/page.tsx, add the dropdown option
  if (filePath.endsWith('pos-setup\\page.tsx') || filePath.endsWith('pos-setup/page.tsx')) {
    if (!newContent.includes('value="native"')) {
      newContent = newContent.replace(
        /<SelectItem value="usb">USB Printer<\/SelectItem>/g,
        '<SelectItem value="usb">USB Printer</SelectItem>\n                      <SelectItem value="native">Native (DLL) Printer</SelectItem>'
      );
    }
  }

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      updateFile(fullPath);
    }
  }
}

directories.forEach(dir => processDirectory(path.join(process.cwd(), dir)));
