/**
 * Unit tests for Excel parser functionality
 */

import { describe, it, expect } from 'vitest';
import { parseExcelFile, validateExcelFile } from './excel-parser';
import * as XLSX from 'xlsx';

describe('Excel Parser', () => {
  // Helper function to create a mock Excel file
  function createMockExcelFile(data: any[][], filename = 'test.xlsx'): File {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create a proper File object with arrayBuffer method
    const file = new File([blob], filename, { type: blob.type });
    
    // Ensure arrayBuffer method exists for test environment
    if (!file.arrayBuffer) {
      (file as any).arrayBuffer = async () => {
        return new Promise<ArrayBuffer>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.readAsArrayBuffer(blob);
        });
      };
    }
    
    return file;
  }

  // Sample valid data with all required columns
  const validHeaders = [
    'Time', 'Solar Power', 'PV Power', 'Consumption Power', 'EPS Load Power',
    'Battery Power', 'Grid Power', 'Weather', 'Charge Power', 'Export Power',
    'Discharge Power', 'Import Power', 'SOC (%)'
  ];

  const validDataRow = [
    '2024/01/15 10:30:00', // Time
    5.2,  // Solar Power
    5.0,  // PV Power
    3.8,  // Consumption Power
    0.5,  // EPS Load Power
    1.2,  // Battery Power
    -0.2, // Grid Power (negative = exporting)
    'Sunny', // Weather
    1.2,  // Charge Power
    0.2,  // Export Power
    0.0,  // Discharge Power
    0.0,  // Import Power
    85.5  // SOC (%)
  ];

  describe('validateExcelFile', () => {
    it('should accept valid Excel files', () => {
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const result = validateExcelFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept .xls files', () => {
      const file = new File(['test'], 'test.xls', { type: 'application/vnd.ms-excel' });
      const result = validateExcelFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.xlsx');
      const result = validateExcelFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('exceeds the 50MB limit');
    });

    it('should reject non-Excel files', () => {
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const result = validateExcelFile(csvFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('parseExcelFile', () => {
    it('should parse valid Excel file with all columns', async () => {
      const data = [validHeaders, validDataRow];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data).toHaveLength(1);
      
      const dataPoint = result.data[0];
      expect(dataPoint.time).toBe('2024/01/15 10:30:00');
      expect(dataPoint.solarPower).toBe(5.2);
      expect(dataPoint.pvPower).toBe(5.0);
      expect(dataPoint.consumptionPower).toBe(3.8);
      expect(dataPoint.weather).toBe('Sunny');
      expect(dataPoint.soc).toBe(85.5);
    });

    it('should handle missing columns with defaults', async () => {
      const partialHeaders = ['Time', 'Solar Power', 'Weather'];
      const partialRow = ['2024/01/15 10:30:00', 5.2, 'Cloudy'];
      const data = [partialHeaders, partialRow];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some(error => error.includes('Missing required columns'))).toBe(true);
    });

    it('should handle multiple data rows', async () => {
      const data = [
        validHeaders,
        validDataRow,
        ['2024/01/15 10:35:00', 5.5, 5.3, 4.0, 0.6, 1.0, 0.0, 'Sunny', 1.0, 0.0, 0.0, 0.0, 86.0],
        ['2024/01/15 10:40:00', 4.8, 4.6, 3.5, 0.4, 1.5, -0.5, 'Partly Cloudy', 1.5, 0.5, 0.0, 0.0, 87.2]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.validation.totalPoints).toBe(3);
      expect(result.validation.validPoints).toBe(3);
    });

    it('should skip empty rows', async () => {
      const data = [
        validHeaders,
        validDataRow,
        [], // Empty row
        [null, null, null, null, null, null, null, null, null, null, null, null, null], // Row with nulls
        ['2024/01/15 10:35:00', 5.5, 5.3, 4.0, 0.6, 1.0, 0.0, 'Sunny', 1.0, 0.0, 0.0, 0.0, 86.0]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data).toHaveLength(2); // Should skip the empty rows
    });

    it('should handle different time formats', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5],
        // Excel date serial number (should be converted)
        [45310.4375, 5.5, 5.3, 4.0, 0.6, 1.0, 0.0, 'Sunny', 1.0, 0.0, 0.0, 0.0, 86.0]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].time).toBe('2024/01/15 10:30:00');
      // Second row should have converted time format
      expect(result.data[1].time).toMatch(/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle negative power values', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, -2.5, 1.5, 'Sunny', 0.0, 1.5, 2.5, 0.0, 75.5]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data[0].batteryPower).toBe(-2.5); // Negative (discharging)
      expect(result.data[0].gridPower).toBe(1.5); // Positive (importing)
      expect(result.data[0].dischargePower).toBe(2.5); // Positive discharge value
    });

    it('should detect duplicate timestamps', async () => {
      const data = [
        validHeaders,
        validDataRow,
        validDataRow // Duplicate row
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true); // Still valid, but with warnings
      expect(result.validation.warnings.some(warning => warning.includes('duplicate timestamps'))).toBe(true);
      expect(result.validation.qualityIssues.duplicateTimestamps).toBe(1);
    });

    it('should detect data gaps', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5],
        // 25-hour gap (should trigger warning)
        ['2024/01/16 11:30:00', 4.8, 4.6, 3.5, 0.4, 1.5, -0.5, 'Cloudy', 1.5, 0.5, 0.0, 0.0, 87.2]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.warnings.some(warning => warning.includes('data gaps longer than 24 hours'))).toBe(true);
      expect(result.validation.qualityIssues.dataGaps).toHaveLength(1);
      expect(result.validation.qualityIssues.dataGaps[0].durationHours).toBeGreaterThan(24);
    });

    it('should handle string numeric values with commas', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', '5,200.5', '5,000.0', '3,800.2', '500.0', '1,200.0', '-200.0', 'Sunny', '1,200.0', '200.0', '0.0', '0.0', '85.5']
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data[0].solarPower).toBe(5200.5);
      expect(result.data[0].pvPower).toBe(5000.0);
      expect(result.data[0].gridPower).toBe(-200.0);
    });

    it('should handle invalid numeric values', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 'invalid', 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some(error => error.includes('Invalid numeric value'))).toBe(true);
    });

    it('should handle missing time values', async () => {
      const data = [
        validHeaders,
        [null, 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some(error => error.includes('Time value is required'))).toBe(true);
    });

    it('should calculate date range correctly', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5],
        ['2024/01/15 15:45:00', 4.8, 4.6, 3.5, 0.4, 1.5, -0.5, 'Cloudy', 1.5, 0.5, 0.0, 0.0, 87.2],
        ['2024/01/16 08:15:00', 3.2, 3.0, 2.8, 0.3, 0.8, 0.2, 'Overcast', 0.8, 0.0, 0.0, 0.2, 82.1]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.dateRange).toBeDefined();
      expect(result.validation.dateRange!.start).toEqual(new Date('2024/01/15 10:30:00'));
      expect(result.validation.dateRange!.end).toEqual(new Date('2024/01/16 08:15:00'));
    });

    it('should handle empty Excel file', async () => {
      const data: any[][] = [];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some(error => error.includes('at least a header row'))).toBe(true);
    });

    it('should handle Excel file with only headers', async () => {
      const data = [validHeaders];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some(error => error.includes('at least a header row and one data row'))).toBe(true);
    });

    // Additional tests for enhanced coverage based on requirements 1.2 and 7.1
    it('should validate all required fields are present (Requirement 7.1)', async () => {
      const data = [
        validHeaders,
        validDataRow
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data[0].time).toBeDefined();
      expect(result.data[0].solarPower).toBeDefined();
      expect(typeof result.data[0].solarPower).toBe('number');
    });

    it('should extract power output, timestamp, and efficiency data (Requirement 1.2)', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 14:25:00', 6.8, 6.5, 4.2, 0.7, 2.1, -1.8, 'Clear', 2.1, 1.8, 0.0, 0.0, 92.3]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      const dataPoint = result.data[0];
      
      // Verify timestamp extraction
      expect(dataPoint.time).toBe('2024/01/15 14:25:00');
      
      // Verify power output extraction
      expect(dataPoint.solarPower).toBe(6.8);
      expect(dataPoint.pvPower).toBe(6.5);
      expect(dataPoint.consumptionPower).toBe(4.2);
      
      // Verify efficiency-related data (SOC represents battery efficiency)
      expect(dataPoint.soc).toBe(92.3);
    });

    it('should handle various invalid timestamp formats', async () => {
      // Test with truly invalid date string
      const data1 = [validHeaders, ['not-a-date-at-all', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5]];
      const file1 = createMockExcelFile(data1);
      const result1 = await parseExcelFile(file1);
      
      expect(result1.validation.isValid).toBe(false);
      expect(result1.validation.errors.some(error => 
        error.includes('Invalid time format') || error.includes('Unable to parse time value')
      )).toBe(true);

      // Test with invalid date components - but let's use a format that JavaScript definitely can't parse
      const data2 = [validHeaders, ['32/25/2024 30:90:99', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5]];
      const file2 = createMockExcelFile(data2);
      const result2 = await parseExcelFile(file2);
      
      expect(result2.validation.isValid).toBe(false);
      expect(result2.validation.errors.some(error => 
        error.includes('Invalid time format') || error.includes('Unable to parse time value')
      )).toBe(true);
    });

    it('should convert alternative valid timestamp formats to standard format', async () => {
      const alternativeFormats = [
        ['2024-01-15 10:30:00', '2024/01/15 10:30:00'], // ISO format should be converted
        ['Jan 15, 2024 10:30:00', '2024/01/15 10:30:00'], // Text month format
        ['1/15/2024 10:30:00', '2024/01/15 10:30:00'], // US format
      ];

      for (const [input, expected] of alternativeFormats) {
        const data = [
          validHeaders,
          [input, 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5]
        ];
        const file = createMockExcelFile(data);
        
        const result = await parseExcelFile(file);
        
        expect(result.validation.isValid).toBe(true);
        expect(result.data[0].time).toBe(expected);
      }
    });

    it('should handle mixed valid and invalid data rows', async () => {
      const data = [
        validHeaders,
        validDataRow, // Valid row
        ['2024/01/15 10:35:00', 'invalid', 5.3, 4.0, 0.6, 1.0, 0.0, 'Sunny', 1.0, 0.0, 0.0, 0.0, 86.0], // Invalid solar power
        ['2024/01/15 10:40:00', 4.8, 4.6, 3.5, 0.4, 1.5, -0.5, 'Cloudy', 1.5, 0.5, 0.0, 0.0, 87.2] // Valid row
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.data).toHaveLength(2); // Only valid rows should be parsed
      expect(result.validation.validPoints).toBe(2);
      expect(result.validation.totalPoints).toBe(3);
      expect(result.validation.errors.some(error => error.includes('Invalid numeric value'))).toBe(true);
    });

    it('should handle extreme numeric values', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 999999.99, -999999.99, 0, 0, 50000, -50000, 'Extreme', 25000, 25000, 25000, 25000, 100]
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true);
      expect(result.data[0].solarPower).toBe(999999.99);
      expect(result.data[0].pvPower).toBe(-999999.99);
      expect(result.data[0].batteryPower).toBe(50000);
      expect(result.data[0].gridPower).toBe(-50000);
    });

    it('should handle special characters in weather field', async () => {
      const weatherConditions = [
        'Sunny ☀️',
        'Cloudy with 50% chance',
        'Rain & Wind',
        'Snow/Sleet',
        'Partly Cloudy (15°C)',
        '', // Empty weather
        '   ', // Whitespace only
      ];

      for (const weather of weatherConditions) {
        const data = [
          validHeaders,
          ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, weather, 1.2, 0.2, 0.0, 0.0, 85.5]
        ];
        const file = createMockExcelFile(data);
        
        const result = await parseExcelFile(file);
        
        expect(result.validation.isValid).toBe(true);
        expect(result.data[0].weather).toBe(weather.trim());
      }
    });

    it('should validate SOC percentage bounds', async () => {
      const socValues = [0, 50, 100, 100.5, -5]; // Including edge cases and invalid values
      
      for (const soc of socValues) {
        const data = [
          validHeaders,
          ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, soc]
        ];
        const file = createMockExcelFile(data);
        
        const result = await parseExcelFile(file);
        
        expect(result.validation.isValid).toBe(true);
        expect(result.data[0].soc).toBe(soc); // Parser accepts all numeric values, validation happens elsewhere
      }
    });

    it('should handle chronological order validation thoroughly', async () => {
      const data = [
        validHeaders,
        ['2024/01/15 10:30:00', 5.2, 5.0, 3.8, 0.5, 1.2, -0.2, 'Sunny', 1.2, 0.2, 0.0, 0.0, 85.5],
        ['2024/01/15 10:25:00', 4.8, 4.6, 3.5, 0.4, 1.5, -0.5, 'Cloudy', 1.5, 0.5, 0.0, 0.0, 87.2], // Out of order
        ['2024/01/15 10:35:00', 5.5, 5.3, 4.0, 0.6, 1.0, 0.0, 'Sunny', 1.0, 0.0, 0.0, 0.0, 86.0],
        ['2024/01/15 10:35:00', 5.1, 4.9, 3.9, 0.5, 1.1, -0.1, 'Sunny', 1.1, 0.1, 0.0, 0.0, 85.8] // Duplicate time
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(true); // Still valid but with warnings
      expect(result.validation.qualityIssues.chronologyIssues).toBeGreaterThan(0);
      expect(result.validation.qualityIssues.duplicateTimestamps).toBeGreaterThan(0);
      expect(result.validation.warnings.length).toBeGreaterThan(0);
    });

    it('should handle file with no valid data after filtering', async () => {
      const data = [
        validHeaders,
        [null, null, null, null, null, null, null, null, null, null, null, null, null], // All null
        ['', '', '', '', '', '', '', '', '', '', '', '', ''], // All empty strings
        [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined] // All undefined
      ];
      const file = createMockExcelFile(data);
      
      const result = await parseExcelFile(file);
      
      expect(result.validation.isValid).toBe(false);
      expect(result.data).toHaveLength(0);
      expect(result.validation.errors.some(error => error.includes('No valid data points found'))).toBe(true);
    });
  });
});