const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app/dashboard').filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('<form') && content.includes('useUnsavedChanges')) {
    let modified = false;

    // Check if router.back() is used
    if (content.includes('router.back()')) {
      content = content.replace(/router\.back\(\)/g, 'attemptBack()');
      modified = true;
    }

    // Check if window.location.href is used for redirecting after save
    if (content.match(/window\.location\.href\s*=\s*['"`].*?['"`]/)) {
      content = content.replace(/window\.location\.href\s*=\s*(['"`].*?['"`])/g, 'setIsDirty(false); router.push($1)');
      modified = true;
    }

    if (modified) {
      if (!content.includes('useFormDirty')) {
         content = content.replace('import { useUnsavedChanges }', 'import { useFormDirty } from "@/context/FormDirtyContext";\nimport { useUnsavedChanges }');
      }
      if (!content.includes('attemptBack')) {
         content = content.replace('useUnsavedChanges(isDirty);', 'const { attemptBack } = useFormDirty();\n  useUnsavedChanges(isDirty);');
      } else if (content.includes('attemptBack()') && !content.includes('const { attemptBack }')) {
         content = content.replace('useUnsavedChanges(isDirty);', 'const { attemptBack } = useFormDirty();\n  useUnsavedChanges(isDirty);');
      }

      fs.writeFileSync(f, content);
      console.log('Updated', f);
    }
  }
});
