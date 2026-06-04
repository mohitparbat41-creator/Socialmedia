export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) {
    console.warn("No data to export");
    return;
  }

  // Extract headers
  const headers = Object.keys(data[0]);

  // Convert to CSV string
  const csvRows = [];
  
  // 1. Add headers row
  csvRows.push(headers.join(","));

  // 2. Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      // Escape strings containing commas or quotes
      if (typeof val === 'string') {
        const escaped = val.replace(/"/g, '""'); // escape quotes
        return `"${escaped}"`; // wrap in quotes
      }
      return val !== null && val !== undefined ? val : "";
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  
  // Create a blob and download
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
