/**
 * TypeScript interfaces for electric fee calculation functionality
 */

/**
 * Electricity rate structure for fee calculations
 */
export interface ElectricityRate {
  /** Standard rate per kWh */
  standardRate: number;
  
  /** Time-of-use rates (optional) */
  timeOfUse?: {
    /** Peak hours rate per kWh */
    peakRate: number;
    
    /** Off-peak hours rate per kWh */
    offPeakRate: number;
    
    /** Peak hours definition (24-hour format) */
    peakHours: {
      start: number; // 0-23
      end: number;   // 0-23
    };
  };
  
  /** Net metering rate per kWh exported */
  netMeteringRate: number;
  
  /** Monthly connection fee */
  monthlyConnectionFee: number;
  
  /** Currency code */
  currency: string;
}

/**
 * Monthly electric bill information
 */
export interface MonthlyBill {
  /** Month in YYYY-MM format */
  month: string;
  
  /** Total bill amount before solar */
  totalAmount: number;
  
  /** kWh consumed from grid */
  gridConsumption: number;
  
  /** Average rate per kWh */
  averageRate: number;
}

/**
 * Fee calculation result for a specific period
 */
export interface FeeCalculationResult {
  /** Period identifier (daily/monthly) */
  period: string;
  
  /** Energy consumed from grid (kWh) */
  gridConsumption: number;
  
  /** Energy exported to grid (kWh) */
  gridExport: number;
  
  /** Solar energy generated (kWh) */
  solarGeneration: number;
  
  /** Total energy consumption (kWh) */
  totalConsumption: number;
  
  /** Cost without solar ($) */
  costWithoutSolar: number;
  
  /** Actual cost with solar ($) */
  actualCost: number;
  
  /** Net metering credits ($) */
  netMeteringCredits: number;
  
  /** Total savings ($) */
  totalSavings: number;
  
  /** Percentage of bill offset by solar */
  billOffsetPercentage: number;
  
  /** Self-consumption rate (%) */
  selfConsumptionRate: number;
}

/**
 * Annual savings projection
 */
export interface AnnualProjection {
  /** Projected annual solar generation (kWh) */
  projectedGeneration: number;
  
  /** Projected annual savings ($) */
  projectedSavings: number;
  
  /** Projected bill offset percentage */
  projectedOffsetPercentage: number;
  
  /** Seasonal variation factors */
  seasonalFactors: {
    spring: number; // March-May multiplier
    summer: number; // June-August multiplier
    fall: number;   // September-November multiplier
    winter: number; // December-February multiplier
  };
  
  /** Confidence level of projection (0-1) */
  confidenceLevel: number;
}

/**
 * Comprehensive savings report
 */
export interface SavingsReport {
  /** Monthly calculation results */
  monthlyResults: FeeCalculationResult[];
  
  /** Annual projection */
  annualProjection: AnnualProjection;
  
  /** Summary statistics */
  summary: {
    /** Total period covered (months) */
    totalMonths: number;
    
    /** Average monthly savings */
    averageMonthlySavings: number;
    
    /** Total savings to date */
    totalSavings: number;
    
    /** Average bill offset percentage */
    averageBillOffset: number;
    
    /** Average self-consumption rate */
    averageSelfConsumption: number;
  };
  
  /** Rate configuration used */
  rateConfiguration: ElectricityRate;
  
  /** Generation timestamp */
  generatedAt: Date;
}