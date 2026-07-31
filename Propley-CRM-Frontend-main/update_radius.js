const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let count = 0;
walkDir('/Users/sm8uti/Documents/Swoyam Bhai Works/cobrowsing/propley/src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('rounded-none')) {
      let newContent = content.replace(/rounded-none/g, 'rounded-lg');
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('Updated', filePath);
      count++;
    }
  }
});
console.log('Total files updated:', count);
