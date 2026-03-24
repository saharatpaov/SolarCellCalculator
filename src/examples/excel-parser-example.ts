/**
 * Example usage of the Excel parser for PlantsDetails-History.xlsx format
 * This demonstrates how to use the parseExcelFile function to process solar data
 */

import { parseExcelFile, validateExcelFile } from '../utils/excel-parser';
import type { SolarDataPoint } from '../types';

/**
 * Example function showing how to process an uploaded Excel file
 */
export async function processExcelFile(file: File): Promise<{
  success: boolean;
  data?: SolarDataPoint[];
  error?: string;
  warnings?: string[];
}> {
  try {
    // First validate the file
    const fileValidation = validateExcelFile(file);
    if (!fileValidation.isValid) {
      return {
        success: false,
        error: fileValidation.error
      };
    }

    // Parse the Excel file
    const result = await parseExcelFile(file);
    
    if (!result.validation.isValid) {
      return {
        success: false,
        error: `Parsing failed: ${result.validation.errors.join(', ')}`,
        warnings: result.validation.warnings
      };
    }

    // Success - return the parsed data
    return {
      success: true,
      data: result.data,
      warnings: result.validation.warnings.length > 0 ? result.validation.warnings : undefined
    };

  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Example of processing and analyzing the parsed data
 */
export function analyzeExcelData(data: SolarDataPoint[]): {
  totalDataPoints: number;
  dateRange: { start: string; end: string };
  averageSolarPower: number;
  totalEnergyGenerated: number; // kWh (assuming 5-minute intervals)
  peakSolarPower: number;
  batteryUsageStats: {
    averageSOC: number;
    maxChargePower: number;
    maxDischargePower: number;
  };
} {
  if (data.length === 0) {
    throw new Error('No data to analyze');
  }

  // Sort data by time for proper analysis
  const sortedData = [...data].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  
  // Calculate basic statistics
  const totalSolarPower = sortedData.reduce((sum, point) => sum + point.solarPower, 0);
  const averageSolarPower = totalSolarPower / sortedData.length;
  
  // Calculate total energy (assuming 5-minute intervals = 1/12 hour)
  const intervalHours = 5 / 60; // 5 minutes in hours
  const totalEnergyGenerated = sortedData.reduce((sum, point) => sum + (point.solarPower * intervalHours), 0);
  
  // Find peak solar power
  const peakSolarPower = Math.max(...sortedData.map(point => point.solarPower));
  
  // Battery statistics
  const totalSOC = sortedData.reduce((sum, point) => sum + point.soc, 0);
  const averageSOC = totalSOC / sortedData.length;
  const maxChargePower = Math.max(...sortedData.map(point => point.chargePower));
  const maxDischargePower = Math.max(...sortedData.map(point => point.dischargePower));

  return {
    totalDataPoints: sortedData.length,
    dateRange: {
      start: sortedData[0].time,
      end: sortedData[sortedData.length - 1].time
    },
    averageSolarPower,
    totalEnergyGenerated,
    peakSolarPower,
    batteryUsageStats: {
      averageSOC,
      maxChargePower,
      maxDischargePower
    }
  };
}

/**
 * Example usage in a React component or similar context
 */
export const ExcelParserUsageExample = `
// Example usage in a file upload handler:

const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const result = await processExcelFile(file);
    
    if (result.success && result.data) {
      console.log('Successfully parsed', result.data.length, 'data points');
      
      // Analyze the data
      const analysis = analyzeExcelData(result.data);
      console.log('Analysis:', analysis);
      
      // Show warnings if any
      if (result.warnings) {
        console.warn('Data quality warnings:', result.warnings);
      }
      
      // Use the data for visualization, calculations, etc.
      // setChartData(result.data);
      // setAnalysis(analysis);
      
    } else {
      console.error('Failed to parse Excel file:', result.error);
    }
  } catch (error) {
    console.error('Error processing file:', error);
  }
};

// Expected Excel file format:
// - Column 1: Time (YYYY/MM/DD HH:MM:SS)
// - Column 2: Solar Power (kW)
// - Column 3: PV Power (kW)
// - Column 4: Consumption Power (kW)
// - Column 5: EPS Load Power (kW)
// - Column 6: Battery Power (kW, positive=charging, negative=discharging)
// - Column 7: Grid Power (kW, positive=importing, negative=exporting)
// - Column 8: Weather (text)
// - Column 9: Charge Power (kW)
// - Column 10: Export Power (kW)
// - Column 11: Discharge Power (kW)
// - Column 12: Import Power (kW)
// - Column 13: SOC (%) - State of Charge percentage
`;