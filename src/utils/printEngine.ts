/**
 * Enterprise Print Engine for Official Documents, Forms, Barcodes, and Stock Ledgers.
 * Provides isolated, clean printing without capturing UI navigation, sidebars, modals, or screen backgrounds.
 */

interface PrintOptions {
  title?: string;
  orientation?: 'portrait' | 'landscape';
  hideUrlAndHeader?: boolean;
}

/**
 * Print a specific DOM element in clean, high-contrast, official A4 format.
 * Uses an isolated hidden iframe to guarantee zero UI interference (no sidebars, navbars, or overlays).
 */
export const printElement = (
  elementOrId: string | HTMLElement,
  options: PrintOptions = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    const targetElement =
      typeof elementOrId === 'string'
        ? document.getElementById(elementOrId)
        : elementOrId;

    if (!targetElement) {
      console.warn(`[PrintEngine] Element not found: ${elementOrId}. Falling back to window.print()`);
      window.print();
      resolve(false);
      return;
    }

    const {
      title = document.title || 'سند رسمی',
      orientation = 'portrait',
    } = options;

    try {
      // Remove any existing print frame
      const oldFrame = document.getElementById('enterprise-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      // Create hidden iframe for completely isolated printing
      const iframe = document.createElement('iframe');
      iframe.id = 'enterprise-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      iframe.style.zIndex = '-9999';

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        resolve(false);
        return;
      }

      // Collect all stylesheets and style tags from current document
      const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
        .map(tag => tag.outerHTML)
        .join('\n');

      // Additional dedicated print layout CSS for pristine Persian document rendering
      const customPrintStyles = `
        <style>
          @page {
            size: A4 ${orientation};
            margin: 6mm 8mm 6mm 8mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            direction: rtl;
            text-align: right;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            font-size: 11pt;
            line-height: 1.5;
          }
          .print\\:hidden, button, input[type="button"], nav, aside, header {
            display: none !important;
          }
          .print\\:flex {
            display: flex !important;
          }
          .print\\:block {
            display: block !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }
          thead {
            display: table-header-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border-color: #334155 !important;
          }
          .barcode-roll-label {
            page-break-after: always !important;
            break-after: page !important;
            margin-bottom: 4mm !important;
          }
          /* Remove max-height and scrolling from printable content */
          div, section, main {
            max-height: none !important;
            overflow: visible !important;
            height: auto !important;
          }
        </style>
      `;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>${title}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
            ${styleSheets}
            ${customPrintStyles}
          </head>
          <body class="bg-white text-slate-950 p-2 font-vazir" dir="rtl">
            <div class="print-container w-full max-w-full">
              ${targetElement.outerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      // Allow fonts and images/SVGs (barcodes) to load before printing
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            iframe.remove();
            resolve(true);
          }, 1000);
        } catch (e) {
          console.error('[PrintEngine] Print execution error:', e);
          window.print();
          iframe.remove();
          resolve(false);
        }
      };

      if (iframe.contentWindow) {
        if (frameDoc.readyState === 'complete') {
          setTimeout(triggerPrint, 250);
        } else {
          iframe.onload = () => setTimeout(triggerPrint, 250);
        }
      } else {
        triggerPrint();
      }
    } catch (err) {
      console.error('[PrintEngine] Isolated print error, falling back to window.print():', err);
      window.print();
      resolve(false);
    }
  });
};
