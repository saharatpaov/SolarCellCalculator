/**
 * Excel file parser for PlantsDetails-History.xlsx format
 * Handles the specific 13-column structure with 5-minute interval solar data
 */

import * as XLSX from 'xlsx';
import type { SolarDataPoint, DataValidationResult } from '../types';

/**
 * Column mapping for the PlantsDetails-History.xlsx format
 * Maps Excel column names to our interface properties
 */
const COLUMN_MAPPING = {
  'Time': 'time',
  'Solar Power': 'solarPower',
  'PV Power': 'pvPower', 
  'Consumption Power': 'consumptionPower',
  'EPS Load Power': 'epsLoadPower',
  'Battery Power': 'batteryPower',
  'Grid Power': 'gridPower',
  'Weather': 'weather',
  'Charge Power': 'chargePower',
  'Export Power': 'exportPower',
  'Discharge Power': 'dischargePower',
  'Import Power': 'importPower',
  'SOC (%)': 'soc'
} as const;

/**
 * Expected column names in the Excel file
 */
const EXPECTED_COLUMNS = Object.keys(COLUMN_MAPPING);

/**
 * Parse Excel file and extract solar data points
 */
export async function parseExcelFile(file: File): Promise<{
  data: SolarDataPoint[];
  validation: DataValidationResult;
}> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse Excel workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No worksheets found in Excel file');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: null 
    }) as any[][];
    
    if (jsonData.length < 2) {
      throw new Error('Excel file must contain at least a header row and one data row');
    }
    
    // Extract headers and validate structure
    const headers = jsonData[0] as string[];
    const validationResult = validateExcelStructure(headers);
    
    if (!validationResult.isValid) {
      return {
        data: [],
        validation: validationResult
      };
    }
    
    // Parse data rows
    const dataRows = jsonData.slice(1);
    const parsedData: SolarDataPoint[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // Excel row number (1-indexed + header)
      
      try {
        const dataPoint = parseDataRow(row, headers, rowNumber);
        if (dataPoint) {
          parsedData.push(dataPoint);
        }
      } catch (error) {
        const errorMsg = `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
      }
    }
    
    // Validate parsed data
    const dataValidation = validateParsedData(parsedData);
    
    return {
      data: parsedData,
      validation: {
        isValid: errors.length === 0 && dataValidation.isValid,
        errors: [...errors, ...dataValidation.errors],
        warnings: [...warnings, ...dataValidation.warnings],
        totalPoints: dataRows.length,
        validPoints: parsedData.length,
        dateRange: parsedData.length > 0 ? {
          start: new Date(Math.min(...parsedData.map(p => new Date(p.time).getTime()))),
          end: new Date(Math.max(...parsedData.map(p => new Date(p.time).getTime())))
        } : null,
        qualityIssues: dataValidation.qualityIssues
      }
    };
    
  } catch (error) {
    return {
      data: [],
      validation: {
        isValid: false,
        errors: [`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        totalPoints: 0,
        validPoints: 0,
        dateRange: null,
        qualityIssues: {
          duplicateTimestamps: 0,
          chronologyIssues: 0,
          dataGaps: []
        }
      }
    };
  }
}

/**
 * Validate Excel file structure and column headers
 */
function validateExcelStructure(headers: string[]): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check if all expected columns are present
  const missingColumns = EXPECTED_COLUMNS.filter(col => !headers.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  // Check for extra columns
  const extraColumns = headers.filter(col => !EXPECTED_COLUMNS.includes(col));
  if (extraColumns.length > 0) {
    warnings.push(`Extra columns found (will be ignored): ${extraColumns.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalPoints: 0,
    validPoints: 0,
    dateRange: null,
    qualityIssues: {
      duplicateTimestamps: 0,
      chronologyIssues: 0,
      dataGaps: []
    }
  };
}

/**
 * Parse a single data row from Excel
 */
function parseDataRow(row: any[], headers: string[], rowNumber: number): SolarDataPoint | null {
  // Skip empty rows
  if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
    return null;
  }
  
  const dataPoint: Partial<SolarDataPoint> = {};
  
  // Map each column to the corresponding property
  for (let i = 0; i < headers.length; i++) {
    const columnName = headers[i];
    const cellValue = row[i];
    
    if (columnName in COLUMN_MAPPING) {
      const propertyName = COLUMN_MAPPING[columnName as keyof typeof COLUMN_MAPPING];
      
      if (propertyName === 'time') {
        // Handle time column - convert Excel date/time to string
        dataPoint.time = parseTimeValue(cellValue, rowNumber);
      } else if (propertyName === 'weather') {
        // Handle weather as string
        dataPoint.weather = cellValue ? String(cellValue).trim() : '';
      } else {
        // Handle numeric columns
        (dataPoint as any)[propertyName] = parseNumericValue(cellValue, columnName, rowNumber);
      }
    }
  }
  
  // Validate required fields
  if (!dataPoint.time) {
    throw new Error('Missing or invalid Time value');
  }
  
  // Set defaults for missing numeric values
  const numericFields = [
    'solarPower', 'pvPower', 'consumptionPower', 'epsLoadPower',
    'batteryPower', 'gridPower', 'chargePower', 'exportPower',
    'dischargePower', 'importPower', 'soc'
  ];
  
  for (const field of numericFields) {
    if (dataPoint[field as keyof SolarDataPoint] === undefined) {
      (dataPoint as any)[field] = 0;
    }
  }
  
  if (dataPoint.weather === undefined) {
    dataPoint.weather = '';
  }
  
  return dataPoint as SolarDataPoint;
}

/**
 * Parse time value from Excel cell
 */
function parseTimeValue(cellValue: any, _rowNumber: number): string {
  if (!cellValue) {
    throw new Error('Time value is required');
  }
  
  // If it's already a string in the expected format
  if (typeof cellValue === 'string') {
    // Validate format: YYYY/MM/DD HH:MM:SS
    const timeRegex = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
    if (timeRegex.test(cellValue)) {
      return cellValue;
    }
    
    // Try to parse as date string
    const date = new Date(cellValue);
    if (!isNaN(date.getTime())) {
      return formatDateToExcelFormat(date);
    }
    
    throw new Error(`Invalid time format: ${cellValue}`);
  }
  
  // If it's a number (Excel date serial number)
  if (typeof cellValue === 'number') {
    const date = XLSX.SSF.parse_date_code(cellValue);
    if (date) {
      const jsDate = new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S);
      return formatDateToExcelFormat(jsDate);
    }
  }
  
  // If it's already a Date object
  if (cellValue instanceof Date) {
    return formatDateToExcelFormat(cellValue);
  }
  
  throw new Error(`Unable to parse time value: ${cellValue}`);
}

/**
 * Format Date object to YYYY/MM/DD HH:MM:SS format
 */
function formatDateToExcelFormat(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Parse numeric value from Excel cell
 */
function parseNumericValue(cellValue: any, columnName: string, _rowNumber: number): number {
  if (cellValue === null || cellValue === undefined || cellValue === '') {
    return 0; // Default to 0 for missing values
  }
  
  if (typeof cellValue === 'number') {
    return cellValue;
  }
  
  if (typeof cellValue === 'string') {
    const parsed = parseFloat(cellValue.replace(/,/g, '')); // Remove commas
    if (isNaN(parsed)) {
      throw new Error(`Invalid numeric value in ${columnName}: ${cellValue}`);
    }
    return parsed;
  }
  
  throw new Error(`Unable to parse numeric value in ${columnName}: ${cellValue}`);
}

/**
 * Validate parsed data for quality issues
 */
function validateParsedData(data: SolarDataPoint[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  qualityIssues: DataValidationResult['qualityIssues'];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const qualityIssues = {
    duplicateTimestamps: 0,
    chronologyIssues: 0,
    dataGaps: [] as Array<{ start: Date; end: Date; durationHours: number; }>
  };
  
  if (data.length === 0) {
    errors.push('No valid data points found');
    return { isValid: false, errors, warnings, qualityIssues };
  }
  
  // Check for duplicate timestamps
  const timestamps = new Set<string>();
  let duplicateCount = 0;
  
  for (const point of data) {
    if (timestamps.has(point.time)) {
      duplicateCount++;
    } else {
      timestamps.add(point.time);
    }
  }
  
  qualityIssues.duplicateTimestamps = duplicateCount;
  
  if (duplicateCount > 0) {
    warnings.push(`Found ${duplicateCount} duplicate timestamps`);
  }
  
  // Sort data by timestamp for chronology check
  const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  
  // Check chronological order
  let chronologyIssues = 0;
  for (let i = 1; i < sortedData.length; i++) {
    const prevTime = new Date(sortedData[i - 1].time).getTime();
    const currTime = new Date(sortedData[i].time).getTime();
    
    if (currTime <= prevTime) {
      chronologyIssues++;
    }
  }
  
  qualityIssues.chronologyIssues = chronologyIssues;
  if (chronologyIssues > 0) {
    warnings.push(`Found ${chronologyIssues} chronological order issues`);
  }
  
  // Check for data gaps (>24 hours)
  for (let i = 1; i < sortedData.length; i++) {
    const prevTime = new Date(sortedData[i - 1].time);
    const currTime = new Date(sortedData[i].time);
    const gapHours = (currTime.getTime() - prevTime.getTime()) / (1000 * 60 * 60);
    
    if (gapHours > 24) {
      qualityIssues.dataGaps.push({
        start: prevTime,
        end: currTime,
        durationHours: gapHours
      });
    }
  }
  
  if (qualityIssues.dataGaps.length > 0) {
    warnings.push(`Found ${qualityIssues.dataGaps.length} data gaps longer than 24 hours`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    qualityIssues
  };
}

/**
 * Validate file before parsing
 */
export function validateExcelFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB in bytes
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds the 50MB limit`
    };
  }
  
  // Check file extension
  const validExtensions = ['.xlsx', '.xls'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Invalid file type. Please upload an Excel file (.xlsx or .xls)`
    };
  }
  
  return { isValid: true };
}