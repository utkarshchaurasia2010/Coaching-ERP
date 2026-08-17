/**
 * Utility to export data to CSV and trigger a download in the browser.
 * 
 * @param filename Name of the file (e.g., "students.csv")
 * @param rows Array of objects representing the data rows
 * @param headers Optional array of strings representing the column headers. If not provided, keys of the first object are used.
 */
export function downloadCSV(filename: string, rows: Record<string, any>[], headers?: string[]) {
  if (!rows || !rows.length) {
    console.warn("No data to export");
    return;
  }

  // Determine headers if not explicitly provided
  const columnHeaders = headers || Object.keys(rows[0]);

  // Map rows to CSV format
  const csvContent = [
    columnHeaders.join(','), // Header row
    ...rows.map(row => 
      columnHeaders.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        // Escape quotes and wrap in quotes if there's a comma or newline
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    )
  ].join('\n');

  // Create Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
