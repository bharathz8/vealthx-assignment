// fix-imports.js

import fs from 'fs';
import path from 'path';

// Files to target (TypeScript only)
const fileExtensions = ['.ts', '.tsx'];

// Regex to find relative import paths missing extensions
const importRegex = /(?<=from\s+['"])(\.{1,2}\/[^'"]+?)(?=['"])/g;

// Recursively read files in src/
function fixImportsInDir(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      fixImportsInDir(fullPath);
    } else if (fileExtensions.includes(path.extname(file))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const matches = [...content.matchAll(importRegex)];

      if (matches.length > 0) {
        for (const match of matches) {
          const importPath = match[0];
          // Only update if it doesn't already have an extension
          if (!path.extname(importPath)) {
            content = content.replace(importPath, importPath + '.js');
          }
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Fixed imports in ${fullPath}`);
      }
    }
  }
}

fixImportsInDir('./src');
