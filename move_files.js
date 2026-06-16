const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'rekber-app');
const destDir = __dirname;

function moveFiles(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath);
      }
      moveFiles(srcPath, destPath);
    } else {
      // Overwrite if exists (e.g., package.json)
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

moveFiles(srcDir, destDir);
console.log('Moved all files to root!');
