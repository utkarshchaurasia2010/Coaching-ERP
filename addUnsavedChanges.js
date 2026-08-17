const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src/app/dashboard').filter(f => f.endsWith('new\\page.tsx') || f.endsWith('edit\\page.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (!content.includes('useUnsavedChanges')) {
    // Add import
    content = content.replace(/(import .* from [\"'].*[\"'];\n)+/, match => match + 'import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";\n');
    
    // Add hook usage
    content = content.replace(/const \[loading, setLoading\] = useState\(false\);/, 'const [loading, setLoading] = useState(false);\n  const [isDirty, setIsDirty] = useState(false);\n  useUnsavedChanges(isDirty);');
    
    // Add form onChange
    content = content.replace(/<form /g, '<form onChange={() => setIsDirty(true)} ');
    
    // Clear dirty state on submit
    content = content.replace(/router\.replace\(/g, 'setIsDirty(false);\n      router.replace(');
    
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
