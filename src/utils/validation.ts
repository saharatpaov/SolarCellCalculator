/**
 * Data validation utilities for solar cell data
 */

import type { SolarDataPoint, DataValidationResult } from '../types';
import { VALIDATION } from './constants';

/**
 * Validates a single solar data point
 */
export function validateDataPoint(point: Partial<SolarDataPoint>): string[] {
  const errors: string[] = [];

  // Check required fields (Requirements 7.1)
  if (!point.time || point.time.trim() === '') {
    errors.push('Missing or empty timestamp field - timestamp is required for all data points');
  }

  // Solar power and consumption power are required fields
  if (point.solarPower === null || point.solarPower === undefined || typeof point.solarPower !== 'number') {
    errors.push('Solar power is required and must be a valid number');
  }

  if (point.consumptionPower === null || point.consumptionPower === undefined || typeof point.consumptionPower !== 'number') {
    errors.push('Consumption power is required and must be a valid number');
  }

  // Validate numeric ranges - power values can be positive or negative
  // Solar power and PV power can be negative in some conditions (e.g., system maintenance, inverter consumption)
  if (typeof point.solarPower === 'number' && !isFinite(point.solarPower)) {
    errors.push('Solar power must be a finite number (not NaN or Infinity)');
  }

  if (typeof point.pvPower === 'number' && !isFinite(point.pvPower)) {
    errors.push('PV power must be a finite number (not NaN or Infinity)');
  }

  if (typeof point.consumptionPower === 'number' && !isFinite(point.consumptionPower)) {
    errors.push('Consumption power must be a finite number (not NaN or Infinity)');
  }

  // Battery power can be positive (charging) or negative (discharging)
  if (typeof point.batteryPower === 'number' && !isFinite(point.batteryPower)) {
    errors.push('Battery power must be a finite number (not NaN or Infinity)');
  }

  // Grid power can be positive (importing) or negative (exporting)
  if (typeof point.gridPower === 'number' && !isFinite(point.gridPower)) {
    errors.push('Grid power must be a finite number (not NaN or Infinity)');
  }

  // SOC must be between 0 and 100 percent
  if (typeof point.soc === 'number' && (point.soc < 0 || point.soc > 100 || !isFinite(point.soc))) {
    errors.push('State of Charge (SOC) must be between 0 and 100 percent');
  }

  // Validate other power fields if present
  if (typeof point.chargePower === 'number' && (point.chargePower < 0 || !isFinite(point.chargePower))) {
    errors.push('Charge power must be a non-negative finite number');
  }

  if (typeof point.dischargePower === 'number' && (point.dischargePower < 0 || !isFinite(point.dischargePower))) {
    errors.push('Discharge power must be a non-negative finite number');
  }

  if (typeof point.exportPower === 'number' && (point.exportPower < 0 || !isFinite(point.exportPower))) {
    errors.push('Export power must be a non-negative finite number');
  }

  if (typeof point.importPower === 'number' && (point.importPower < 0 || !isFinite(point.importPower))) {
    errors.push('Import power must be a non-negative finite number');
  }

  return errors;
}

/**
 * Validates timestamp format and parseability
 */
export function validateTimestamp(timeString: string): { isValid: boolean; date?: Date; error?: string } {
  if (!timeString || typeof timeString !== 'string') {
    return { isValid: false, error: 'Timestamp is missing or not a string - expected format: YYYY/MM/DD HH:MM:SS or ISO 8601' };
  }

  const trimmed = timeString.trim();
  if (trimmed === '') {
    return { isValid: false, error: 'Timestamp is empty - expected format: YYYY/MM/DD HH:MM:SS or ISO 8601' };
  }

  try {
    // Try parsing the timestamp
    const date = new Date(trimmed);
    
    if (isNaN(date.getTime())) {
      return { 
        isValid: false, 
        error: `Cannot parse timestamp "${trimmed}" - expected format: YYYY/MM/DD HH:MM:SS or ISO 8601 (e.g., 2024-01-15T10:30:00)` 
      };
    }

    // Check for reasonable date range (not too far in past or future)
    const now = new Date();
    const minDate = new Date('1990-01-01');
    const maxDate = new Date(now.getFullYear() + 10, 11, 31); // 10 years in future

    if (date < minDate || date > maxDate) {
      return {
        isValid: false,
        error: `Timestamp "${trimmed}" is outside reasonable range (1990 to ${maxDate.getFullYear()}) - please check date format`
      };
    }

    return { isValid: true, date };
  } catch (error) {
    return { 
      isValid: false, 
      error: `Timestamp parsing failed for "${trimmed}" - expected format: YYYY/MM/DD HH:MM:SS or ISO 8601` 
    };
  }
}

/**
 * Checks if timestamps are in chronological order
 */
export function validateChronologicalOrder(timestamps: Date[]): number[] {
  const violations: number[] = [];
  
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] <= timestamps[i - 1]) {
      violations.push(i);
    }
  }
  
  return violations;
}

/**
 * Detects data gaps longer than the threshold
 */
export function detectDataGaps(timestamps: Date[], maxGapHours: number = VALIDATION.MAX_DATA_GAP_HOURS) {
  const gaps: Array<{ start: Date; end: Date; durationHours: number }> = [];
  
  for (let i = 1; i < timestamps.length; i++) {
    const gapMs = timestamps[i].getTime() - timestamps[i - 1].getTime();
    const gapHours = gapMs / (1000 * 60 * 60);
    
    if (gapHours > maxGapHours) {
      gaps.push({
        start: timestamps[i - 1],
        end: timestamps[i],
        durationHours: gapHours
      });
    }
  }
  
  return gaps;
}

/**
 * Finds duplicate timestamps
 */
export function findDuplicateTimestamps(timestamps: Date[]): number {
  const seen = new Set<number>();
  let duplicates = 0;
  
  for (const timestamp of timestamps) {
    const time = timestamp.getTime();
    if (seen.has(time)) {
      duplicates++;
    } else {
      seen.add(time);
    }
  }
  
  return duplicates;
}

/**
 * Handles missing values in solar data by applying appropriate strategies
 */
export function handleMissingValues(data: SolarDataPoint[]): {
  processedData: SolarDataPoint[];
  missingValueReport: {
    totalMissing: number;
    byField: Record<string, number>;
    strategy: string;
  };
} {
  const processedData = [...data];
  const missingValueReport = {
    totalMissing: 0,
    byField: {} as Record<string, number>,
    strategy: 'null-preservation'
  };

  // Count missing values by field
  const fields = ['solarPower', 'pvPower', 'consumptionPower', 'batteryPower', 'gridPower', 'soc'] as const;
  
  fields.forEach(field => {
    const missing = data.filter(point => 
      point[field] === null || 
      point[field] === undefined || 
      (typeof point[field] === 'number' && !isFinite(point[field]))
    ).length;
    
    missingValueReport.byField[field] = missing;
    missingValueReport.totalMissing += missing;
  });

  // For now, we preserve null/undefined values as they are
  // In the future, we could implement interpolation or other strategies
  // based on user preferences or data characteristics

  return {
    processedData,
    missingValueReport
  };
}

/**
 * Validates data consistency and logical relationships
 */
export function validateDataConsistency(data: SolarDataPoint[]): string[] {
  const warnings: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    
    // Check if charge/discharge powers are consistent with battery power
    if (typeof point.batteryPower === 'number' && 
        typeof point.chargePower === 'number' && 
        typeof point.dischargePower === 'number') {
      
      if (point.batteryPower > 0 && point.chargePower === 0) {
        warnings.push(`Row ${i + 1}: Battery power is positive but charge power is zero - possible data inconsistency`);
      }
      
      if (point.batteryPower < 0 && point.dischargePower === 0) {
        warnings.push(`Row ${i + 1}: Battery power is negative but discharge power is zero - possible data inconsistency`);
      }
    }
    
    // Check if import/export powers are consistent with grid power
    if (typeof point.gridPower === 'number' && 
        typeof point.importPower === 'number' && 
        typeof point.exportPower === 'number') {
      
      if (point.gridPower > 0 && point.importPower === 0) {
        warnings.push(`Row ${i + 1}: Grid power is positive but import power is zero - possible data inconsistency`);
      }
      
      if (point.gridPower < 0 && point.exportPower === 0) {
        warnings.push(`Row ${i + 1}: Grid power is negative but export power is zero - possible data inconsistency`);
      }
    }
    
    // Check for unrealistic SOC changes
    if (i > 0 && 
        typeof point.soc === 'number' && 
        typeof data[i-1].soc === 'number') {
      
      const socChange = Math.abs(point.soc - data[i-1].soc);
      if (socChange > 20) { // More than 20% change in 5 minutes is unusual
        warnings.push(`Row ${i + 1}: Large SOC change (${socChange.toFixed(1)}%) from previous reading - verify data accuracy`);
      }
    }
  }
  
  return warnings;
}

/**
 * Comprehensive validation of solar data array
 */
export function validateSolarData(data: SolarDataPoint[]): DataValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let validPoints = 0;
  const timestamps: Date[] = [];
  const missingValueCounts = {
    solarPower: 0,
    consumptionPower: 0,
    batteryPower: 0,
    gridPower: 0,
    soc: 0
  };

  // Check if data array is empty
  if (!data || data.length === 0) {
    errors.push('No data points found - please ensure the file contains valid solar power data');
    return {
      isValid: false,
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

  // Validate each data point
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const pointErrors = validateDataPoint(point);
    
    // Count missing values for reporting
    if (point.solarPower === null || point.solarPower === undefined) missingValueCounts.solarPower++;
    if (point.consumptionPower === null || point.consumptionPower === undefined) missingValueCounts.consumptionPower++;
    if (point.batteryPower === null || point.batteryPower === undefined) missingValueCounts.batteryPower++;
    if (point.gridPower === null || point.gridPower === undefined) missingValueCounts.gridPower++;
    if (point.soc === null || point.soc === undefined) missingValueCounts.soc++;
    
    if (pointErrors.length === 0) {
      validPoints++;
      
      // Validate and collect timestamps for chronological and gap analysis
      const timestampResult = validateTimestamp(point.time);
      if (timestampResult.isValid && timestampResult.date) {
        timestamps.push(timestampResult.date);
      } else {
        errors.push(`Row ${i + 1}: ${timestampResult.error}`);
      }
    } else {
      errors.push(`Row ${i + 1}: ${pointErrors.join('; ')}`);
    }
  }

  // Report missing value statistics
  Object.entries(missingValueCounts).forEach(([field, count]) => {
    if (count > 0) {
      const percentage = ((count / data.length) * 100).toFixed(1);
      if (count > data.length * 0.1) { // More than 10% missing
        warnings.push(`${field} has ${count} missing values (${percentage}% of data) - this may affect analysis accuracy`);
      } else {
        warnings.push(`${field} has ${count} missing values (${percentage}% of data)`);
      }
    }
  });

  // Check overall data quality (Requirement 7.1)
  const validPercentage = data.length > 0 ? validPoints / data.length : 0;
  if (validPercentage < VALIDATION.MIN_VALID_DATA_PERCENTAGE) {
    errors.push(`Data quality insufficient: only ${(validPercentage * 100).toFixed(1)}% of data points are valid (minimum ${VALIDATION.MIN_VALID_DATA_PERCENTAGE * 100}% required for reliable analysis)`);
  }

  // Validate chronological order (Requirement 7.4)
  const chronologyIssues = validateChronologicalOrder(timestamps);
  if (chronologyIssues.length > 0) {
    if (chronologyIssues.length > timestamps.length * 0.05) { // More than 5% out of order
      errors.push(`Timestamps are significantly out of chronological order (${chronologyIssues.length} violations) - this will affect time-series analysis`);
    } else {
      warnings.push(`${chronologyIssues.length} timestamps are out of chronological order - data may need resorting`);
    }
  }

  // Detect data gaps (Requirement 7.5)
  const dataGaps = detectDataGaps(timestamps);
  if (dataGaps.length > 0) {
    const totalGapHours = dataGaps.reduce((sum, gap) => sum + gap.durationHours, 0);
    warnings.push(`${dataGaps.length} data gaps longer than ${VALIDATION.MAX_DATA_GAP_HOURS} hours detected (total gap time: ${totalGapHours.toFixed(1)} hours) - this may indicate data collection issues`);
    
    // Report the largest gaps
    const largestGaps = dataGaps
      .sort((a, b) => b.durationHours - a.durationHours)
      .slice(0, 3);
    
    largestGaps.forEach((gap, index) => {
      warnings.push(`Gap ${index + 1}: ${gap.durationHours.toFixed(1)} hours from ${gap.start.toISOString()} to ${gap.end.toISOString()}`);
    });
  }

  // Find duplicate timestamps (Requirement 7.3)
  const duplicateTimestamps = findDuplicateTimestamps(timestamps);
  if (duplicateTimestamps > 0) {
    if (duplicateTimestamps > VALIDATION.MAX_DUPLICATE_TIMESTAMPS) {
      errors.push(`Too many duplicate timestamps found (${duplicateTimestamps}) - maximum ${VALIDATION.MAX_DUPLICATE_TIMESTAMPS} allowed. This indicates serious data quality issues.`);
    } else {
      warnings.push(`${duplicateTimestamps} duplicate timestamps found - these may cause issues in time-series analysis`);
    }
  }

  // Check data consistency and logical relationships
  const consistencyWarnings = validateDataConsistency(data);
  warnings.push(...consistencyWarnings);

  // Determine date range
  let dateRange = null;
  if (timestamps.length > 0) {
    const sortedTimestamps = [...timestamps].sort((a, b) => a.getTime() - b.getTime());
    dateRange = {
      start: sortedTimestamps[0],
      end: sortedTimestamps[sortedTimestamps.length - 1]
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalPoints: data.length,
    validPoints,
    dateRange,
    qualityIssues: {
      duplicateTimestamps,
      chronologyIssues: chronologyIssues.length,
      dataGaps
    }
  };
}