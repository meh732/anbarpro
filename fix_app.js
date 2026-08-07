const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The messed up part is:
//       {isScannerOpen {isScannerOpen && ({isScannerOpen && ( (
//         <BarcodeModal onClose={() => setIsScannerOpen(false)} />
//       )}
//
//       <MobileBottomNav />
//         <BarcodeModal onClose={() => setIsScannerOpen(false)} />
//       )}
//     </div>

content = content.replace(/\{isScannerOpen \{isScannerOpen && \(\{isScannerOpen && \( \([\s\S]*?\)\}\s*<\/div>/m, 
`{isScannerOpen && (
        <BarcodeModal onClose={() => setIsScannerOpen(false)} />
      )}
      <MobileBottomNav />
    </div>`);

fs.writeFileSync('src/App.tsx', content);
