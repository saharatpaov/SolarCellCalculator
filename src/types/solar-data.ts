/**
 * Core TypeScript interfaces for Solar Cell Analytics Application
 * Based on PlantsDetails-History.xlsx format with 5-minute interval data
 */

/**
 * Raw data point from Excel file representing a single 5-minute reading
 * Matches the exact column structure from PlantsDetails-History.xlsx
 */
export interface SolarDataPoint {
  /** Time in YYYY/MM/DD HH:MM:SS format */
  time: string;
  
  /** Solar Power generation in kW (can be 0 or positive) */
  solarPower: number;
  
  /** PV Power generation in kW (can be 0 or positive) */
  pvPower: number;
  
  /** Consumption Power in kW (typically positive) */
  consumptionPower: number;
  
  /** EPS Load Power in kW */
  epsLoadPower: number;
  
  /** Battery Power in kW (positive = charging, negative = discharging) */
  batteryPower: number;
  
  /** Grid Power in kW (positive = importing, negative = exporting) */
  gridPower: number;
  
  /** Weather condition as text */
  weather: string;
  
  /** Charge Power in kW (positive value) */
  chargePower: number;
  
  /** Export Power to grid in kW (positive value) */
  exportPower: number;
  
  /** Discharge Power from battery in kW (positive value) */
  dischargePower: number;
  
  /** Import Power from grid in kW (positive value) */
  importPower: number;
  
  /** State of Charge percentage (0-100%) */
  soc: number;
}

/**
 * Processed data point with parsed timestamp for easier manipulation
 */
export interface ProcessedSolarDataPoint extends Omit<SolarDataPoint, 'time'> {
  /** Parsed timestamp as Date object */
  timestamp: Date;
  
  /** Original time string for reference */
  originalTime: string;
}

/**
 * Daily aggregated solar data for summary views
 */
export interface DailySolarSummary {
  /** Date in YYYY-MM-DD format */
  date: string;
  
  /** Total solar energy generated in kWh */
  totalSolarEnergy: number;
  
  /** Total PV energy generated in kWh */
  totalPvEnergy: number;
  
  /** Total energy consumed in kWh */
  totalConsumption: number;
  
  /** Total energy exported to grid in kWh */
  totalExport: number;
  
  /** Total energy imported from grid in kWh */
  totalImport: number;
  
  /** Average SOC percentage */
  averageSoc: number;
  
  /** Peak solar power in kW */
  peakSolarPower: number;
  
  /** Number of data points for this day */
  dataPointCount: number;
}

/**
 * Monthly aggregated solar data for trend analysis
 */
export interface MonthlySolarSummary {
  /** Month in YYYY-MM format */
  month: string;
  
  /** Total solar energy generated in kWh */
  totalSolarEnergy: number;
  
  /** Total energy consumed in kWh */
  totalConsumption: number;
  
  /** Net energy (solar - consumption) in kWh */
  netEnergy: number;
  
  /** Total export to grid in kWh */
  totalExport: number;
  
  /** Total import from grid in kWh */
  totalImport: number;
  
  /** Average daily solar generation in kWh */
  averageDailyGeneration: number;
  
  /** Number of days with data */
  daysWithData: number;
}

/**
 * Data validation result for imported files
 * Enhanced to support comprehensive validation reporting
 */
export interface DataValidationResult {
  /** Whether the data passed validation */
  isValid: boolean;
  
  /** Array of error messages */
  errors: string[];
  
  /** Array of warning messages */
  warnings: string[];
  
  /** Total number of data points */
  totalPoints: number;
  
  /** Number of valid data points */
  validPoints: number;
  
  /** Date range of the data */
  dateRange: {
    start: Date;
    end: Date;
  } | null;
  
  /** Detected data quality issues */
  qualityIssues: {
    duplicateTimestamps: number;
    chronologyIssues: number;
    dataGaps: Array<{
      start: Date;
      end: Date;
      durationHours: number;
    }>;
  };
  
  /** Validation performance metrics */
  performance: {
    /** Validation duration in milliseconds */
    validationTime: number;
    /** Memory usage during validation */
    memoryUsage?: number;
  };
  
  /** Data statistics for quality assessment */
  statistics: {
    /** Average solar power generation */
    avgSolarPower: number;
    /** Peak solar power */
    peakSolarPower: number;
    /** Total energy generated */
    totalEnergy: number;
    /** Data completeness percentage */
    completeness: number;
  };
}

/**
 * Dataset metadata for data management
 * Supports requirements 5.1 (browser session storage) and 5.5 (metadata display)
 */
export interface DatasetMetadata {
  /** Unique identifier for the dataset */
  id: string;
  
  /** Original filename */
  fileName: string;
  
  /** Import timestamp */
  importDate: Date;
  
  /** Number of data points */
  recordCount: number;
  
  /** File size in bytes */
  fileSize: number;
  
  /** Data date range */
  dateRange: {
    start: Date;
    end: Date;
  };
  
  /** Validation result */
  validation: DataValidationResult;
  
  /** Processing status for UI feedback */
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  
  /** Optional description or notes */
  description?: string;
}

/**
 * Complete dataset containing all imported and processed data
 */
export interface SolarDataset {
  /** Dataset metadata */
  metadata: DatasetMetadata;
  
  /** Raw data points as imported */
  rawData: SolarDataPoint[];
  
  /** Processed data points with parsed timestamps */
  processedData: ProcessedSolarDataPoint[];
  
  /** Daily summaries */
  dailySummaries: DailySolarSummary[];
  
  /** Monthly summaries */
  monthlySummaries: MonthlySolarSummary[];
}

/**
 * Application state for managing multiple datasets
 * Supports requirement 5.1 (browser session storage)
 */
export interface AppState {
  /** All imported datasets */
  datasets: SolarDataset[];
  
  /** Currently selected dataset ID */
  selectedDatasetId: string | null;
  
  /** Current date range filter */
  dateFilter: {
    start: Date | null;
    end: Date | null;
  };
  
  /** UI state */
  ui: {
    isLoading: boolean;
    currentView: 'import' | 'visualize' | 'calculate';
    error: string | null;
  };
  
  /** Session information for storage management */
  session: {
    /** Session start time */
    startTime: Date;
    /** Last activity timestamp */
    lastActivity: Date;
    /** Storage usage in bytes */
    storageUsed: number;
  };
}

/**
 * Session storage configuration and limits
 */
export interface SessionStorageConfig {
  /** Maximum storage size in bytes (default: 50MB) */
  maxStorageSize: number;
  
  /** Maximum number of datasets to keep in session */
  maxDatasets: number;
  
  /** Session timeout in milliseconds */
  sessionTimeout: number;
  
  /** Auto-cleanup enabled */
  autoCleanup: boolean;
}

/**
 * Export configuration for data export functionality
 * Supports requirement 5.3 (export processed data as CSV)
 */
export interface ExportConfig {
  /** Export format */
  format: 'csv' | 'json' | 'xlsx';
  
  /** Include raw data */
  includeRawData: boolean;
  
  /** Include processed data */
  includeProcessedData: boolean;
  
  /** Include daily summaries */
  includeDailySummaries: boolean;
  
  /** Include monthly summaries */
  includeMonthlySummaries: boolean;
  
  /** Date range for export */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Custom filename */
  filename?: string;
}

/**
 * Hourly aggregated solar data for detailed analysis
 */
export interface HourlySolarSummary {
  /** Hour in YYYY-MM-DD HH format */
  hour: string;
  
  /** Average solar power in kW */
  avgSolarPower: number;
  
  /** Peak solar power in kW */
  peakSolarPower: number;
  
  /** Total energy generated in kWh */
  totalEnergy: number;
  
  /** Average consumption in kW */
  avgConsumption: number;
  
  /** Net energy (generation - consumption) in kWh */
  netEnergy: number;
  
  /** Average SOC percentage */
  avgSoc: number;
  
  /** Predominant weather condition */
  weather: string;
  
  /** Number of data points in this hour */
  dataPointCount: number;
}

/**
 * Data aggregation options for flexible summarization
 */
export interface AggregationOptions {
  /** Aggregation period */
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  
  /** Date range for aggregation */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Fields to include in aggregation */
  includeFields: {
    solarPower: boolean;
    consumption: boolean;
    battery: boolean;
    grid: boolean;
    weather: boolean;
    soc: boolean;
  };
  
  /** Aggregation methods for numeric fields */
  methods: {
    /** Method for power values */
    power: 'average' | 'sum' | 'peak' | 'all';
    /** Method for energy calculations */
    energy: 'sum' | 'average';
    /** Method for SOC */
    soc: 'average' | 'min' | 'max' | 'all';
  };
}

/**
 * Generic aggregated data result
 */
export interface AggregatedDataResult {
  /** Aggregation period used */
  period: string;
  
  /** Date range of aggregated data */
  dateRange: {
    start: Date;
    end: Date;
  };
  
  /** Aggregated data points */
  data: Array<{
    /** Time period identifier */
    period: string;
    /** Aggregated values */
    values: Record<string, number | string>;
    /** Number of source data points */
    dataPointCount: number;
  }>;
  
  /** Summary statistics */
  summary: {
    totalDataPoints: number;
    totalPeriods: number;
    avgDataPointsPerPeriod: number;
    completeness: number;
  };
}

/**
 * Data comparison result for analyzing multiple datasets
 */
export interface DataComparisonResult {
  /** Datasets being compared */
  datasets: Array<{
    id: string;
    name: string;
    dateRange: { start: Date; end: Date };
  }>;
  
  /** Comparison metrics */
  metrics: {
    /** Energy generation comparison */
    energyGeneration: {
      dataset1: number;
      dataset2: number;
      difference: number;
      percentageDifference: number;
    };
    
    /** Average power comparison */
    avgPower: {
      dataset1: number;
      dataset2: number;
      difference: number;
    };
    
    /** Peak power comparison */
    peakPower: {
      dataset1: number;
      dataset2: number;
      difference: number;
    };
    
    /** Data quality comparison */
    dataQuality: {
      dataset1: number;
      dataset2: number;
      difference: number;
    };
  };
  
  /** Overlapping date range */
  overlapPeriod: {
    start: Date;
    end: Date;
    durationDays: number;
  } | null;
}