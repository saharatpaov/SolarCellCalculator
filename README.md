# Solar Cell Analytics Web Application

A TypeScript-based web application for analyzing solar cell performance data and calculating electric fee savings. The application processes Excel data files (PlantsDetails-History.xlsx format) with 5-minute interval solar power readings.

## Features

- **Data Import**: Upload and parse Excel files with solar power data
- **Data Visualization**: Interactive charts showing power generation, consumption, and battery status
- **Fee Calculation**: Calculate electric bill savings based on solar energy production
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Cross-Browser Support**: Compatible with Chrome, Firefox, Safari, and Edge

## Excel Data Format

The application expects Excel files with the following columns:
- Time (YYYY/MM/DD HH:MM:SS format)
- Solar Power (kW)
- PV Power (kW)
- Consumption Power (kW)
- EPS Load Power (kW)
- Battery Power (kW, positive = charging, negative = discharging)
- Grid Power (kW, positive = importing, negative = exporting)
- Weather (text description)
- Charge Power (kW)
- Export Power (kW)
- Discharge Power (kW)
- Import Power (kW)
- SOC (State of Charge, 0-100%)

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Preview production build
npm run preview
```

### Testing

The project uses Vitest for testing:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Project Structure

```
src/
├── types/           # TypeScript interfaces and types
├── utils/           # Utility functions and constants
├── components/      # React components (to be added)
├── hooks/           # Custom React hooks (to be added)
├── services/        # Data processing services (to be added)
└── App.tsx          # Main application component
```

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest
- **Excel Processing**: SheetJS (xlsx)
- **Styling**: CSS3 with responsive design
- **Linting**: ESLint + TypeScript ESLint

## Performance Requirements

- File import: Complete within 5 seconds for files up to 10,000 data points
- Chart rendering: Complete within 2 seconds for up to 1,000 data points
- File size limit: Maximum 50MB per upload
- Browser support: Chrome, Firefox, Safari, Edge
- Minimum system requirements: 4GB RAM

## License

This project is private and proprietary.# SolarCellCalculator
# SolarCellCalculator
# SolarCellCalculator
