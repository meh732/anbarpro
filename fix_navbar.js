const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

const roleLabels = `
const roleLabels: Record<string, string> = {
  superadmin: 'مدیر کل 시스템',
  admin: 'مدیر تولید',
  manager: 'سرپرست انبار',
  operator: 'اپراتور/مونتاژکار'
};
`;

code = code.replace(
  'const { ',
  roleLabels + '\n  const { \n    users,\n'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
