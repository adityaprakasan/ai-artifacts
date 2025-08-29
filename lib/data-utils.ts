import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedDataset {
  columns: string[];
  rows: any[][];
}

export interface DataPreviewConfig {
  maxRows?: number;
  maxCols?: number;
}

export interface DataSummary {
  rowCount: number;
  columnCount: number;
  columnTypes: Record<string, string>;
}

export const parseCsvFile = (file: File): Promise<ParsedDataset> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }

          const data = results.data as string[][];
          if (data.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          // First row as headers
          const columns = data[0] || [];
          const rows = data.slice(1).filter(row => row.some(cell => String(cell).trim() !== ''));

          if (columns.length === 0) {
            reject(new Error('No columns found in CSV file'));
            return;
          }

          resolve({ columns, rows });
        } catch (error) {
          reject(new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
      header: false,
      skipEmptyLines: true,
    });
  });
};

export const parseExcelFile = (file: File): Promise<ParsedDataset> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error('No worksheets found in Excel file'));
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        }) as any[][];

        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }

        // First row as headers
        const columns = jsonData[0]?.map(col => String(col)) || [];
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));

        if (columns.length === 0) {
          reject(new Error('No columns found in Excel file'));
          return;
        }

        resolve({ columns, rows });
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

export const getDataPreview = (
  dataset: ParsedDataset,
  config: DataPreviewConfig = {}
): ParsedDataset => {
  const { maxRows = 10, maxCols = 10 } = config;
  
  const previewColumns = dataset.columns.slice(0, maxCols);
  const previewRows = dataset.rows.slice(0, maxRows).map(row => 
    row.slice(0, maxCols)
  );

  return {
    columns: previewColumns,
    rows: previewRows
  };
};

export const validateDataFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const allowedExtensions = ['.csv', '.xls', '.xlsx'];
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

  // Check file type
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'File must be a CSV (.csv) or Excel (.xls, .xlsx) file'
    };
  }

  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'File size must be less than 10MB'
    };
  }

  return { isValid: true };
};

export const getDataSummary = (dataset: ParsedDataset): DataSummary => {
  const columnTypes: Record<string, string> = {};

  // Analyze each column to determine its type
  dataset.columns.forEach((column, index) => {
    const values = dataset.rows.map(row => row[index]).filter(val => val !== '' && val != null);
    
    if (values.length === 0) {
      columnTypes[column] = 'empty';
      return;
    }

    // Check if all values are numbers
    const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '');
    if (numericValues.length === values.length) {
      columnTypes[column] = 'number';
      return;
    }

    // Check if values look like dates
    const dateValues = values.filter(val => !isNaN(Date.parse(String(val))));
    if (dateValues.length === values.length && values.length > 0) {
      columnTypes[column] = 'date';
      return;
    }

    // Default to text
    columnTypes[column] = 'text';
  });

  return {
    rowCount: dataset.rows.length,
    columnCount: dataset.columns.length,
    columnTypes
  };
};
