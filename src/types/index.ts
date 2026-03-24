/**
 * Central export file for all TypeScript interfaces and types
 */

// Solar data types
export type {
  SolarDataPoint,
  ProcessedSolarDataPoint,
  DailySolarSummary,
  MonthlySolarSummary,
  DataValidationResult,
  DatasetMetadata,
  SolarDataset,
  AppState,
} from './solar-data';

// Fee calculation types
export type {
  ElectricityRate,
  MonthlyBill,
  FeeCalculationResult,
  AnnualProjection,
  SavingsReport,
} from './fee-calculation';

// Re-export for use in interfaces
import type { SolarDataPoint } from './solar-data';

// Utility types for the application
export interface FileUploadResult {
  success: boolean;
  data?: SolarDataPoint[];
  error?: string;
  fileName: string;
  fileSize: number;
}

export interface ChartDataPoint {
  x: Date;
  y: number;
  label?: string;
}

export interface ChartConfiguration {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  showGrid: boolean;
  enableZoom: boolean;
  enablePan: boolean;
}

export interface ExportOptions {
  format: 'png' | 'pdf' | 'csv';
  filename: string;
  includeMetadata: boolean;
}