// Excel Export/Import Utilities
// Using CSV format with proper encoding for Arabic support

export const exportToExcel = async (data, columns, entityName, language) => {
  if (!data || data.length === 0) return;

  // Filter columns that should be exported
  const exportColumns = columns.filter(col => col.exportable !== false);
  
  // Create header row
  const headers = exportColumns.map(col => {
    if (language === 'ar' && col.headerAr) return col.headerAr;
    return col.header || col.accessorKey;
  });

  // Create data rows
  const rows = data.map(row => {
    return exportColumns.map(col => {
      const value = row[col.accessorKey];
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (col.type === 'date' && value) {
        return new Date(value).toLocaleDateString('en-GB');
      }
      return String(value);
    });
  });

  // Create CSV content with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entityName}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateTemplate = (columns, entityName, language) => {
  // Filter columns that can be imported
  const importColumns = columns.filter(col => col.importable !== false && col.accessorKey !== 'id');
  
  // Create header row
  const headers = importColumns.map(col => {
    if (language === 'ar' && col.headerAr) return col.headerAr;
    return col.header || col.accessorKey;
  });

  // Create column info row
  const infoRow = importColumns.map(col => {
    const parts = [];
    if (col.required) parts.push(language === 'ar' ? 'مطلوب' : 'Required');
    if (col.type) parts.push(col.type);
    return parts.join(' | ');
  });

  // Create example row
  const exampleRow = importColumns.map(col => {
    if (col.example) return col.example;
    switch (col.type) {
      case 'number': return '0';
      case 'boolean': return 'Yes';
      case 'date': return new Date().toLocaleDateString('en-GB');
      default: return language === 'ar' ? 'مثال' : 'Example';
    }
  });

  // Create CSV content with BOM
  const BOM = '\uFEFF';
  const csvContent = BOM + [
    headers.join(','),
    infoRow.map(cell => `"${cell}"`).join(','),
    exampleRow.map(cell => `"${cell}"`).join(',')
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entityName}_Template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseCSV = (text) => {
  const lines = text.split(/\r\n|\n/);
  const result = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = [];
    let cell = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (inQuotes) {
        if (char === '"') {
          if (line[j + 1] === '"') {
            cell += '"';
            j++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(cell.trim());
          cell = '';
        } else {
          cell += char;
        }
      }
    }
    row.push(cell.trim());
    result.push(row);
  }
  
  return result;
};

export const validateImportData = (data, columns, language) => {
  const errors = [];
  const validRows = [];
  const importColumns = columns.filter(col => col.importable !== false && col.accessorKey !== 'id');
  
  // Skip header row(s)
  const dataRows = data.slice(1).filter(row => row.some(cell => cell && cell.trim()));
  
  dataRows.forEach((row, rowIndex) => {
    const rowData = {};
    const rowErrors = [];
    
    importColumns.forEach((col, colIndex) => {
      const value = row[colIndex]?.trim() || '';
      const key = col.accessorKey;
      
      // Check required fields
      if (col.required && !value) {
        rowErrors.push(`${col.header || key}: ${language === 'ar' ? 'مطلوب' : 'Required'}`);
        return;
      }
      
      if (!value) {
        rowData[key] = col.type === 'boolean' ? false : (col.type === 'number' ? 0 : '');
        return;
      }
      
      // Type conversion
      switch (col.type) {
        case 'number':
          const num = parseFloat(value.replace(/,/g, ''));
          if (isNaN(num)) {
            rowErrors.push(`${col.header || key}: ${language === 'ar' ? 'يجب أن يكون رقم' : 'Must be a number'}`);
          } else {
            rowData[key] = num;
          }
          break;
        case 'boolean':
          rowData[key] = ['yes', 'true', '1', 'نعم'].includes(value.toLowerCase());
          break;
        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            rowErrors.push(`${col.header || key}: ${language === 'ar' ? 'تاريخ غير صحيح' : 'Invalid date'}`);
          } else {
            rowData[key] = date.toISOString().split('T')[0];
          }
          break;
        default:
          rowData[key] = value;
      }
    });
    
    if (rowErrors.length > 0) {
      errors.push({ row: rowIndex + 2, errors: rowErrors, data: row });
    } else {
      validRows.push(rowData);
    }
  });
  
  return { validRows, errors };
};