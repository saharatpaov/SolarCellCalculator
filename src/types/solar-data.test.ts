/**
 * Unit tests for solar data type definitions and interfaces
 */

import { describe, it, expect } from 'vitest';
import type { 
  SolarDataPoint, 
  ProcessedSolarDataPoint, 
  DataValidationResult,
  DailySolarSummary,
  DatasetMetadata,
  SessionStorageConfig,
  ExportConfig,
  HourlySolarSummary,
  AggregationOptions
} from './solar-data';

describe('Solar Data Types', () => {
  describe('SolarDataPoint', () => {
    it('should have all required fields', () => {
      const samplePoint: SolarDataPoint = {
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

      // Type checking - if this compiles, the interface is correct
      expect(samplePoint.time).toBe('2024/01/15 10:30:00');
      expect(samplePoint.solarPower).toBe(5.2);
      expect(samplePoint.soc).toBe(85.5);
    });

    it('should allow negative values for battery and grid power', () => {
      const point: SolarDataPoint = {
        time: '2024/01/15 10:30:00',
        solarPower: 0,
        pvPower: 0,
        consumptionPower: 2.0,
        epsLoadPower: 0,
        batteryPower: -1.5, // Discharging
        gridPower: 0.5,     // Importing
        weather: 'Cloudy',
        chargePower: 0,
        exportPower: 0,
        dischargePower: 1.5,
        importPower: 0.5,
        soc: 65.0
      };

      expect(point.batteryPower).toBe(-1.5);
      expect(point.gridPower).toBe(0.5);
    });
  });

  describe('ProcessedSolarDataPoint', () => {
    it('should extend SolarDataPoint with parsed timestamp', () => {
      const processedPoint: ProcessedSolarDataPoint = {
        timestamp: new Date('2024-01-15T10:30:00'),
        originalTime: '2024/01/15 10:30:00',
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

      expect(processedPoint.timestamp).toBeInstanceOf(Date);
      expect(processedPoint.originalTime).toBe('2024/01/15 10:30:00');
    });
  });

  describe('DailySolarSummary', () => {
    it('should contain aggregated daily data', () => {
      const dailySummary: DailySolarSummary = {
        date: '2024-01-15',
        totalSolarEnergy: 45.6,
        totalPvEnergy: 44.2,
        totalConsumption: 32.1,
        totalExport: 8.5,
        totalImport: 2.0,
        averageSoc: 78.5,
        peakSolarPower: 6.8,
        dataPointCount: 288 // 24 hours * 12 (5-minute intervals)
      };

      expect(dailySummary.date).toBe('2024-01-15');
      expect(dailySummary.dataPointCount).toBe(288);
      expect(dailySummary.averageSoc).toBeGreaterThan(0);
      expect(dailySummary.averageSoc).toBeLessThanOrEqual(100);
    });
  });

  describe('DataValidationResult', () => {
    it('should provide comprehensive validation information', () => {
      const validationResult: DataValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Minor data gap detected'],
        totalPoints: 1000,
        validPoints: 998,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        qualityIssues: {
          duplicateTimestamps: 0,
          chronologyIssues: 0,
          dataGaps: []
        }
      };

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.totalPoints).toBe(1000);
      expect(validationResult.validPoints).toBe(998);
      expect(validationResult.dateRange).not.toBeNull();
    });
  });
});