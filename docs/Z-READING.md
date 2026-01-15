# Z-Reading Feature

## Overview

The Z-Reading feature allows you to view, filter, and export historical Z-reading reports. Z-readings are end-of-day sales summaries that provide a comprehensive overview of daily transactions.

## Features

### 1. **View Z-Reading History**

- Access all historical Z-reading reports in a table format
- View key information: Z-Reading ID, Date, Terminal, Cashier, Transaction Count, and Net Sales

### 2. **Filter Options**

- **Date Range Filter**: Filter Z-readings by selecting a date range
- **Printer Format**: Choose between 58mm or 80mm printer formats for viewing and exporting

### 3. **Export Capabilities**

- **View**: Preview the Z-reading report in the selected printer format
- **Print**: Print the Z-reading directly from the browser
- **Export as PDF**: Download the Z-reading as a PDF file
- **Export as Image**: Save the Z-reading as a PNG image

## How to Use

### Accessing Z-Readings

1. Navigate to **Sales** → **Z-Reading** in the main menu
2. The page will display all available Z-reading reports

### Filtering Z-Readings

1. **Select Printer Format**: Choose between 58mm or 80mm from the dropdown
2. **Filter by Date**: Click the date picker to select a date range
3. **Reset Filters**: Click the X button to clear all filters

### Exporting Z-Readings

For each Z-reading in the table, you have four action buttons:

1. **👁️ View**: Opens a preview modal of the Z-reading
2. **🖨️ Print**: Opens the print dialog with the Z-reading formatted for printing
3. **📄 PDF**: Downloads the Z-reading as a PDF file
4. **🖼️ Image**: Downloads the Z-reading as a PNG image

## Z-Reading Report Contents

Each Z-reading report includes:

### Header Information

- Store name and address
- TIN (Tax Identification Number)
- Z-Reading number
- Terminal ID
- Cashier name
- Report date and time

### Sales Summary

- Gross Sales
- Returns
- Discounts
- Net Sales
- VAT Amount (12%)
- Transaction Count

### Payment Breakdown

- Individual payment method totals (Cash, Credit Card, GCash, etc.)
- Total payments

### Cash Summary

- Starting Cash
- Cash Sales
- Cash in Drawer

## Technical Details

### Database Table

The Z-readings are stored in the `z_readings` table with the following structure:

- `id`: Auto-increment primary key
- `reading_number`: Unique Z-reading identifier
- `report_date`: Date and time of the report
- `terminal_id`: POS terminal identifier
- `cashier_name`: Name of the cashier
- `gross_sales`, `returns`, `discounts`, `net_sales`, `vat_amount`: Financial data
- `payment_methods`: JSON array of payment method breakdowns
- `transaction_count`: Number of transactions
- `starting_cash`, `cash_sales`, `cash_in_drawer`: Cash-related data

### API Endpoints

#### GET `/api/sales/z-reading`

Fetches Z-reading reports with optional date filtering.

**Query Parameters:**

- `startDate` (optional): Start date in YYYY-MM-DD format
- `endDate` (optional): End date in YYYY-MM-DD format

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "Z-2026-01-13-001",
      "date": "2026-01-13",
      "reportDate": "2026-01-13T23:59:59.000Z",
      "grossSales": 8540.50,
      "returns": -120.00,
      "discounts": -55.25,
      "netSales": 8365.25,
      "vatAmount": 896.28,
      "paymentMethods": [...],
      "transactionCount": 42,
      "startingCash": 5000.00,
      "cashSales": 4500.00,
      "cashInDrawer": 9500.00,
      "cashierName": "John Doe",
      "terminalId": "POS-001"
    }
  ]
}
```

#### POST `/api/sales/z-reading`

Creates a new Z-reading report.

**Request Body:**

```json
{
  "readingNumber": "Z-2026-01-13-001",
  "reportDate": "2026-01-13T23:59:59",
  "terminalId": "POS-001",
  "cashierName": "John Doe",
  "grossSales": 8540.50,
  "returns": -120.00,
  "discounts": -55.25,
  "netSales": 8365.25,
  "vatAmount": 896.28,
  "paymentMethods": [...],
  "transactionCount": 42,
  "startingCash": 5000.00,
  "cashSales": 4500.00,
  "cashInDrawer": 9500.00
}
```

## Printer Format Differences

### 58mm Format

- Optimized for small thermal printers
- Narrower layout (220px max width)
- Smaller font sizes for compact printing
- Ideal for receipt printers

### 80mm Format

- Standard thermal printer format
- Wider layout (300px max width)
- Slightly larger fonts for better readability
- More spacing for professional appearance

## Dependencies

The Z-Reading feature uses the following libraries:

- `html2canvas`: For converting the preview to canvas/image
- `jspdf`: For generating PDF files
- `date-fns`: For date formatting
- `react-day-picker`: For date range selection

## Setup

To set up the Z-Reading feature:

1. Run the migration to create the table:

   ```bash
   node scripts/run_z_readings_migration.js
   ```

2. The feature is now ready to use at `/sales/z-reading`

## Future Enhancements

Potential improvements for the Z-Reading feature:

- Email Z-reading reports
- Scheduled automatic Z-reading generation
- Comparison between multiple Z-readings
- Export to Excel format
- Custom report templates
- Multi-store support with store filtering
