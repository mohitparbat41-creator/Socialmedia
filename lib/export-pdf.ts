import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportToPDF(elementId: string = "main-content", filename: string = "Mafatlal_Intelligence_Report.pdf") {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Add a temporary class to prepare for printing (e.g., hiding scrollbars, ensuring full height)
    element.classList.add("pdf-exporting");
    
    // We might need to make sure the element is fully visible before capturing
    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    element.classList.remove("pdf-exporting");

    const imgData = canvas.toDataURL("image/png");
    
    // Calculate PDF dimensions (A4 Landscape)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px", // Use pixels to match canvas coordinates easily
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate scaling ratio to fit width
    const ratio = pdfWidth / canvas.width;
    const scaledHeight = canvas.height * ratio;

    let heightLeft = scaledHeight;
    let position = 0; // vertical position in the canvas image

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
    heightLeft -= pdfHeight;

    // Add subsequent pages if the content overflows
    while (heightLeft >= 0) {
      position = heightLeft - scaledHeight; // Shift the image up by the amount we've already printed
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, scaledHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    element.classList.remove("pdf-exporting");
  }
}
