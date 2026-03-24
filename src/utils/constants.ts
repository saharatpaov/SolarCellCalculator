/**
 * Application constants for Solar Cell Analytics
 */

// File upload constraints
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 50,
  MAX_SIZE_BYTES: 50 * 1024 * 1024,
  SUPPORTED_EXTENSIONS: ['.xlsx', '.xls'],
  SUPPORTED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
} as const;

// Performance thresholds
export const PERFORMANCE = {
  MAX_IMPORT_TIME_MS: 5000,
  MAX_CHART_RENDER_TIME_MS: 2000,
  MAX_DATA_POINTS_FOR_IMPORT: 10000,
  MAX_CHART_POINTS_WITHOUT_SAMPLING: 1000
} as const;

// Excel column mapping for PlantsDetails-History.xlsx
export const EXCEL_COLUMNS = {
  TIME: 'Time',
  SOLAR_POWER: 'Solar Power',
  PV_POWER: 'PV Power',
  CONSUMPTION_POWER: 'Consumption Power',
  EPS_LOAD_POWER: 'EPS Load Power',
  BATTERY_POWER: 'Battery Power',
  GRID_POWER: 'Grid Power',
  WEATHER: 'Weather',
  CHARGE_POWER: 'Charge Power',
  EXPORT_POWER: 'Export Power',
  DISCHARGE_POWER: 'Discharge Power',
  IMPORT_POWER: 'Import Power',
  SOC: 'SOC'
} as const;

// Date and time formats
export const DATE_FORMATS = {
  EXCEL_DATETIME: 'YYYY/MM/DD HH:mm:ss',
  ISO_DATE: 'YYYY-MM-DD',
  ISO_MONTH: 'YYYY-MM',
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm'
} as const;

// Data validation thresholds
export const VALIDATION = {
  MAX_DATA_GAP_HOURS: 24,
  MIN_VALID_DATA_PERCENTAGE: 0.8,
  MAX_DUPLICATE_TIMESTAMPS: 10
} as const;

// Chart configuration defaults
export const CHART_DEFAULTS = {
  COLORS: {
    SOLAR_POWER: '#ff9500',
    PV_POWER: '#ffcc00',
    CONSUMPTION_POWER: '#007aff',
    BATTERY_POWER: '#34c759',
    GRID_POWER: '#ff3b30',
    EXPORT_POWER: '#af52de',
    IMPORT_POWER: '#ff2d92',
    SOC: '#5ac8fa'
  },
  ANIMATION_DURATION: 300,
  TOOLTIP_DELAY: 100
} as const;

// Session storage keys
export const STORAGE_KEYS = {
  DATASETS: 'solar_analytics_datasets',
  SELECTED_DATASET: 'solar_analytics_selected_dataset',
  DATE_FILTER: 'solar_analytics_date_filter',
  ELECTRICITY_RATES: 'solar_analytics_electricity_rates'
} as const;