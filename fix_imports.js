const fs = require('fs');

const files = [
  'src/app/dashboard/batches/new/page.tsx',
  'src/app/dashboard/notices/new/page.tsx',
  'src/app/dashboard/schedule/new/page.tsx',
  'src/app/dashboard/staff/new/page.tsx',
  'src/app/dashboard/students/new/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('import { useUnsavedChanges } from')) {
    content = content.replace(/export default function/, 'import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";\n\nexport default function');
    fs.writeFileSync(file, content);
    console.log('Fixed imports in', file);
  }
});
