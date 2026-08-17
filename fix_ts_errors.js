const fs = require('fs');

function fixFile(filePath, fixLogic) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = fixLogic(content);
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed', filePath);
  }
}

// Fix missing CheckCircle2 in collect/page.tsx
fixFile('src/app/dashboard/financials/collect/page.tsx', (content) => {
  return content.replace(/import \{ ([^}]+) \} from "lucide-react";/, (match, imports) => {
    if (!imports.includes('CheckCircle2')) {
      return `import { ${imports}, CheckCircle2 } from "lucide-react";`;
    }
    return match;
  });
});

// Fix missing CheckCircle2 in fees/[id]/edit/page.tsx
fixFile('src/app/dashboard/financials/fees/[id]/edit/page.tsx', (content) => {
  return content.replace(/import \{ ([^}]+) \} from "lucide-react";/, (match, imports) => {
    if (!imports.includes('CheckCircle2')) {
      return `import { ${imports}, CheckCircle2 } from "lucide-react";`;
    }
    return match;
  });
});

const filesToFixIsDirty = [
  'src/app/dashboard/batches/[id]/edit/page.tsx',
  'src/app/dashboard/financials/fees/[id]/edit/page.tsx',
  'src/app/dashboard/notices/new/page.tsx',
  'src/app/dashboard/staff/[id]/edit/page.tsx'
];

filesToFixIsDirty.forEach(file => {
  fixFile(file, (content) => {
    if (!content.includes('const [isDirty, setIsDirty]')) {
      return content.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const [isDirty, setIsDirty] = useState(false);\n  useUnsavedChanges(isDirty);');
    }
    return content;
  });
});

const filesToFixUseUnsavedChanges = [
  'src/app/dashboard/batches/new/page.tsx',
  'src/app/dashboard/schedule/new/page.tsx',
  'src/app/dashboard/staff/new/page.tsx',
  'src/app/dashboard/students/new/page.tsx'
];

filesToFixUseUnsavedChanges.forEach(file => {
  fixFile(file, (content) => {
    let result = content;
    if (!result.includes('useUnsavedChanges')) {
      result = result.replace(/import { supabase } from "@\/lib\/supabase";/, 'import { supabase } from "@/lib/supabase";\nimport { useUnsavedChanges } from "@/hooks/useUnsavedChanges";');
      result = result.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const [isDirty, setIsDirty] = useState(false);\n  useUnsavedChanges(isDirty);');
      result = result.replace(/<form /g, '<form onChange={() => setIsDirty(true)} ');
      result = result.replace(/router\.push\(/g, 'setIsDirty(false);\n      router.replace(');
      result = result.replace(/router\.replace\(/g, 'setIsDirty(false);\n      router.replace(');
    }
    return result;
  });
});
