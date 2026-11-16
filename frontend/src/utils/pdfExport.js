import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Exports a DOM element (Invoice / Estimate Bill) to an A4 PDF and triggers direct download.
 * Uses 2x canvas scaling for crisp vector-like text, borders, and numbers.
 */
export const exportInvoiceToPDF = async (element, filename = 'Invoice.pdf') => {
  if (!element) {
    throw new Error('Printable element not found for PDF export.');
  }

  // Find the invoice root element inside the container
  const targetElement = element.querySelector('.printable-invoice') || element;

  const canvas = await html2canvas(targetElement, {
    scale: 2, // 2x device pixel ratio for 150-200 DPI crisp printing
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    onclone: (clonedDoc) => {
      // Clean up cloned element styling so it occupies exact A4 printable width
      const clonedTarget = clonedDoc.querySelector('.printable-invoice') || clonedDoc.getElementById(element.id);
      if (clonedTarget) {
        clonedTarget.style.width = '198mm';
        clonedTarget.style.maxWidth = '198mm';
        clonedTarget.style.margin = '0 auto';
        clonedTarget.style.padding = '0';
        clonedTarget.style.backgroundColor = '#ffffff';
        clonedTarget.style.color = '#000000';
      }
    }
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  // Standard margins: 6mm left/right, 6mm top
  const marginX = 6;
  const marginTop = 6;
  const contentWidth = pdfWidth - (marginX * 2); // 198mm
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  if (contentHeight <= pdfHeight - (marginTop * 2)) {
    // Fits cleanly on a single A4 page
    pdf.addImage(imgData, 'JPEG', marginX, marginTop, contentWidth, contentHeight);
  } else {
    // Multi-page handling if invoice has more items
    let heightLeft = contentHeight;
    let position = marginTop;

    pdf.addImage(imgData, 'JPEG', marginX, position, contentWidth, contentHeight);
    heightLeft -= (pdfHeight - marginTop);

    while (heightLeft > 0) {
      position = heightLeft - contentHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', marginX, position, contentWidth, contentHeight);
      heightLeft -= pdfHeight;
    }
  }

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(safeFilename);
  return true;
};
