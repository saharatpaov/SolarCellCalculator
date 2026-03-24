/**
 * Unit tests for data validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  validateDataPoint,
  validateTimestamp,
  validateChronologicalOrder,
  detectDataGaps,
  findDuplicateTimestamps,
  validateSolarData,
  handleMissingValues,
  validateDataConsistency
} from './validation';
import type { SolarDataPoint } from '../types';

describe('Validation Utils', () => {
  describe('validateDataPoint', () => {
    it('should pass validation for valid data point', () => {
      const validPoint: SolarDataPoint = {
        time: '2024/01/15 10:30:00',
        solarPower: 5.2,
        pvPower: 5.0,
        consumptionPower: 3.1,
        epsLoadPower: 0.5,
        batteryPower: 1.8,
        gridPower: -0.3,
        weather: 'Sunny',
        chargePower: 1.8,
        exportPower: 0.3,
        dischargePower: 0.0,
        importPower: 0.0,
        soc: 85.5
      };

      const errors = validateDataPoint(validPoint);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const invalidPoint = {
        solarPower: 5.2,
        // Missing time and consumptionPower
      };

      const errors = validateDataPoint(invalidPoint);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.includes('timestamp'))).toBe(true);
      expect(errors.some(error => error.includes('Consumption power is required'))).toBe(true);
    });

    it('should allow negative power values for solar power', () => {
      const validPoint = {
        time: '2024/01/15 10:30:00',
        solarPower: -1.0, // Valid negative value (e.g., inverter consumption)
        consumptionPower: 3.1,
      };

      const errors = validateDataPoint(validPoint);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation for non-finite power values', () => {
      const invalidPoint = {
        time: '2024/01/15 10:30:00',
        solarPower: NaN, // Invalid non-finite value
        consumptionPower: 3.1,
      };

      const errors = validateDataPoint(invalidPoint);
      expect(errors.some(error => error.includes('Solar power must be a finite number'))).toBe(true);
    });

    it('should fail validation for invalid SOC range', () => {
      const invalidPoint = {
        time: '2024/01/15 10:30:00',
        solarPower: 5.2,
        consumptionPower: 3.1,
        soc: 150, // Invalid SOC > 100
      };

      const errors = validateDataPoint(invalidPoint);
      expect(errors.some(error => error.includes('State of Charge (SOC) must be between 0 and 100'))).toBe(true);
    });
  });

  describe('validateTimestamp', () => {
    it('should validate correct timestamp format', () => {
      const result = validateTimestamp('2024/01/15 10:30:00');
      expect(result.isValid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should handle ISO format timestamps', () => {
      const result = validateTimestamp('2024-01-15T10:30:00');
      expect(result.isValid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should fail for invalid timestamp', () => {
      const result = validateTimestamp('invalid-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should fail for empty timestamp', () => {
      const result = validateTimestamp('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateChronologicalOrder', () => {
    it('should pass for chronologically ordered timestamps', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:05:00'),
        new Date('2024-01-15T10:10:00'),
      ];

      const violations = validateChronologicalOrder(timestamps);
      expect(violations).toHaveLength(0);
    });

    it('should detect chronological violations', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:10:00'), // Out of order
        new Date('2024-01-15T10:05:00'),
      ];

      const violations = validateChronologicalOrder(timestamps);
      expect(violations).toHaveLength(1);
      expect(violations[0]).toBe(2);
    });
  });

  describe('detectDataGaps', () => {
    it('should detect no gaps in regular 5-minute intervals', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:05:00'),
        new Date('2024-01-15T10:10:00'),
      ];

      const gaps = detectDataGaps(timestamps, 1); // 1 hour threshold
      expect(gaps).toHaveLength(0);
    });

    it('should detect large data gaps', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-16T10:00:00'), // 24-hour gap
      ];

      const gaps = detectDataGaps(timestamps, 12); // 12 hour threshold
      expect(gaps).toHaveLength(1);
      expect(gaps[0].durationHours).toBe(24);
    });
  });

  describe('findDuplicateTimestamps', () => {
    it('should find no duplicates in unique timestamps', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:05:00'),
        new Date('2024-01-15T10:10:00'),
      ];

      const duplicates = findDuplicateTimestamps(timestamps);
      expect(duplicates).toBe(0);
    });

    it('should count duplicate timestamps', () => {
      const timestamps = [
        new Date('2024-01-15T10:00:00'),
        new Date('2024-01-15T10:00:00'), // Duplicate
        new Date('2024-01-15T10:05:00'),
        new Date('2024-01-15T10:05:00'), // Duplicate
      ];

      const duplicates = findDuplicateTimestamps(timestamps);
      expect(duplicates).toBe(2);
    });
  });

  describe('validateSolarData', () => {
    it('should validate complete dataset successfully', () => {
      const data: SolarDataPoint[] = [
        {
          time: '2024/01/15 10:00:00',
          solarPower: 5.2,
          pvPower: 5.0,
          consumptionPower: 3.1,
          epsLoadPower: 0.5,
          batteryPower: 1.8,
          gridPower: -0.3,
          weather: 'Sunny',
          chargePower: 1.8,
          exportPower: 0.3,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 85.5
        },
        {
          time: '2024/01/15 10:05:00',
          solarPower: 5.8,
          pvPower: 5.6,
          consumptionPower: 2.9,
          epsLoadPower: 0.4,
          batteryPower: 2.1,
          gridPower: -0.8,
          weather: 'Sunny',
          chargePower: 2.1,
          exportPower: 0.8,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 87.2
        }
      ];

      const result = validateSolarData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.totalPoints).toBe(2);
      expect(result.validPoints).toBe(2);
      expect(result.dateRange).not.toBeNull();
    });

    it('should detect validation issues in dataset', () => {
      const data: SolarDataPoint[] = [
        {
          time: 'invalid-time',
          solarPower: NaN, // Invalid non-finite
          pvPower: 5.0,
          consumptionPower: 3.1,
          epsLoadPower: 0.5,
          batteryPower: 1.8,
          gridPower: -0.3,
          weather: 'Sunny',
          chargePower: 1.8,
          exportPower: 0.3,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 150 // Invalid SOC > 100
        }
      ];

      const result = validateSolarData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validPoints).toBe(0);
    });

    it('should handle empty dataset', () => {
      const result = validateSolarData([]);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('No data points found'))).toBe(true);
      expect(result.totalPoints).toBe(0);
      expect(result.validPoints).toBe(0);
    });

    it('should report missing values', () => {
      const data: SolarDataPoint[] = [
        {
          time: '2024/01/15 10:00:00',
          solarPower: null as any, // Missing value
          pvPower: 5.0,
          consumptionPower: 3.1,
          epsLoadPower: 0.5,
          batteryPower: 1.8,
          gridPower: -0.3,
          weather: 'Sunny',
          chargePower: 1.8,
          exportPower: 0.3,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 85.5
        }
      ];

      const result = validateSolarData(data);
      expect(result.warnings.some(warning => warning.includes('solarPower has 1 missing values'))).toBe(true);
    });
  });

  describe('handleMissingValues', () => {
    it('should count missing values correctly', () => {
      const data: SolarDataPoint[] = [
        {
          time: '2024/01/15 10:00:00',
          solarPower: null as any,
          pvPower: 5.0,
          consumptionPower: undefined as any,
          epsLoadPower: 0.5,
          batteryPower: 1.8,
          gridPower: -0.3,
          weather: 'Sunny',
          chargePower: 1.8,
          exportPower: 0.3,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 85.5
        }
      ];

      const result = handleMissingValues(data);
      expect(result.missingValueReport.byField.solarPower).toBe(1);
      expect(result.missingValueReport.byField.consumptionPower).toBe(1);
      expect(result.missingValueReport.totalMissing).toBe(2);
    });
  });

  describe('validateDataConsistency', () => {
    it('should detect battery power inconsistencies', () => {
      const data: SolarDataPoint[] = [
        {
          time: '2024/01/15 10:00:00',
          solarPower: 5.2,
          pvPower: 5.0,
          consumptionPower: 3.1,
          epsLoadPower: 0.5,
          batteryPower: 1.8, // Positive (charging)
          gridPower: -0.3,
          weather: 'Sunny',
          chargePower: 0.0, // But charge power is zero - inconsistent
          exportPower: 0.3,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 85.5
        }
      ];

      const warnings = validateDataConsistency(data);
      expect(warnings.some(warning => warning.includes('Battery power is positive but charge power is zero'))).toBe(true);
    });

    it('should detect large SOC changes', () => {
      const data: SolarDataPoint[] = [
        {
          time: '2024/01/15 10:00:00',
          solarPower: 5.2,
          pvPower: 5.0,
          consumptionPower: 3.1,
          epsLoadPower: 0.5,
          batteryPower: 1.8,
          gridPower: -0.3,
          weather: 'Sunny',
          chargePower: 1.8,
          exportPower: 0.3,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 85.5
        },
        {
          time: '2024/01/15 10:05:00',
          solarPower: 5.8,
          pvPower: 5.6,
          consumptionPower: 2.9,
          epsLoadPower: 0.4,
          batteryPower: 2.1,
          gridPower: -0.8,
          weather: 'Sunny',
          chargePower: 2.1,
          exportPower: 0.8,
          dischargePower: 0.0,
          importPower: 0.0,
          soc: 60.0 // Large SOC drop of 25.5%
        }
      ];

      const warnings = validateDataConsistency(data);
      expect(warnings.some(warning => warning.includes('Large SOC change'))).toBe(true);
    });
  });
});