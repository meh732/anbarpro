import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  marginMm?: number;
  scale?: number;
}

/**
 * Cleanly exports any DOM element to a crisp downloadable PDF file.
 * Handles Persian (RTL) fonts, SVGs (like barcodes/QR codes), tables, and multi-page documents.
 */
export async function exportElementToPdf(
  elementOrId: HTMLElement | string,
  options: PdfExportOptions = {}
): Promise<boolean> {
  const {
    filename = 'document.pdf',
    orientation = 'portrait',
    format = 'a4',
    marginMm = 8,
    scale = 2, // 2x scale for sharp barcode and high DPI typography
  } = options;

  let targetElement: HTMLElement | null = null;
  if (typeof elementOrId === 'string') {
    targetElement = document.getElementById(elementOrId);
  } else {
    targetElement = elementOrId;
  }

  if (!targetElement) {
    console.error('PDF Export Error: Target element not found.', elementOrId);
    return false;
  }

  try {
    // Render target element to canvas using html2canvas
    const canvas = await html2canvas(targetElement, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: targetElement.scrollWidth || 1200,
      onclone: (clonedDoc) => {
        // Ensure cloned element is fully visible and styled
        const clonedTarget = clonedDoc.getElementById(typeof elementOrId === 'string' ? elementOrId : targetElement!.id);
        if (clonedTarget) {
          clonedTarget.style.maxHeight = 'none';
          clonedTarget.style.overflow = 'visible';
        }
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Initialize jsPDF instance
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
    });

    // A4 dimensions in mm
    const pageWidth = orientation === 'portrait' ? 210 : 297;
    const pageHeight = orientation === 'portrait' ? 297 : 210;

    const printableWidth = pageWidth - marginMm * 2;
    const printableHeight = pageHeight - marginMm * 2;

    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = marginMm;

    // First page
    pdf.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= printableHeight;

    // Subsequent pages if document height exceeds single A4 page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + marginMm;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', marginMm, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= printableHeight;
    }

    // Save generated PDF
    const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalFilename);
    return true;
  } catch (error) {
    console.error('Failed to export PDF:', error);
    return false;
  }
}
