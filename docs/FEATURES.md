# StockPilot — Feature Reference

This document provides a comprehensive description of every module and feature in StockPilot Enterprise.

---

## Table of Contents

1. [Point of Sale (POS)](#1-point-of-sale-pos)
2. [Dashboard](#2-dashboard)
3. [Products](#3-products)
4. [Inventory](#4-inventory)
5. [Sales](#5-sales)
6. [Purchases](#6-purchases)
7. [Customers](#7-customers)
8. [Suppliers](#8-suppliers)
9. [Approvals Board](#9-approvals-board)
10. [Reports](#10-reports)
11. [User Management](#11-user-management)
12. [Settings](#12-settings)

---

## 1. Point of Sale (POS)

**Route:** `/pos`  
**Access:** Cashiers (full-screen Electron window) and Admins.

The POS is the front-end cashiering terminal. It runs in an isolated Electron window with its own login and shift management.

### 1.1 Shift Management

| Action | Description |
|--------|-------------|
| **Start Shift** | Cashier declares a starting cash amount before any transactions |
| **End Shift (X-Reading)** | Generates a real-time summary without closing the Z-counter |
| **Shift Takeover** | A new cashier can take over an active shift with admin approval |
| **Cash Transfer** | Record mid-shift cash additions or withdrawals (pickups/deposits) |

### 1.2 Checkout & Tender

- **Barcode / SKU scanning** — add items by scanning or searching by name
- **Product Search Dialog** — fuzzy search with optional stock quantity display
- **Multi-payment tender** — Cash, Card, GCash, PayMaya, Check, or any configured payment method
- **Loyalty Points Redemption** — redeem accumulated customer loyalty points at checkout
- **Senior Citizen / PWD Discount** — 20% SC/PWD statutory discount applied at line level
- **Custom Line Discount** — percentage or fixed-amount discount per item
- **Price-Override (F7)** — one-time price edit with optional admin PIN authentication
- **Item Description Edit (F1)** — edit the display name of an item for this transaction only
- **Quantity Adjustment** — manually increase/decrease item quantity in cart
- **Hold Transaction** — park the active cart and start a new transaction; recall at any time
- **Customer Selection** — attach a customer account to the sale for balance/loyalty tracking
- **Insufficient Stock Dialog** — warns or blocks (configurable) when selling below stock
- **Training Mode** — all transactions are tagged as training and excluded from official totals

### 1.3 Receipt & Printing

- **Official Receipt / Invoice** — BIR-compliant OR with OR number sequences
- **ESC/POS Encoding** — direct thermal printer output via USB Serial or Windows Print Spooler (DLL)
- **Paper Size** — 58mm or 80mm thermal paper support
- **Print Two Receipts** — optional duplicate copy on tender
- **Credit Slip** — auto-generated credit slip for charge-account sales
- **Native (DLL) Print Mode** — uses `koffi` to call the Windows Spooler API for maximum reliability

### 1.4 Post-Transaction Operations

| Operation | Keyboard | Description |
|-----------|----------|-------------|
| **Recent Sales** | F8 | Browse and reprint previous transactions in current shift |
| **Void Transaction** | F9 | Cancel the most recent sale; requires admin auth (configurable) |
| **Return / Merchandise Credit** | — | Process returns; generates a merchandise credit receipt |
| **Price Inquiry** | F6 | Look up the price of any product without adding to cart |
| **Cancel Sale** | ESC | Clear the current cart |

### 1.5 X-Reading & Z-Reading

- **X-Reading** — per-shift summary (does not increment the Z-counter); printable thermal format
- **Z-Reading** — official end-of-day closing report; increments the Z-counter; BIR-compliant format with VAT breakdown, running totals, and transaction ranges

### 1.6 POS Security

All of the following actions can be individually gated behind a separate admin PIN:

- Line void
- Void / return
- Recent sales access
- Price edit
- Tax rate edit
- Cash count (end-shift cash counting)

---

## 2. Dashboard

**Route:** `/dashboard`

The dashboard provides a real-time business overview.

| Widget | Description |
|--------|-------------|
| **Hourly Sales Chart** | Bar chart of today's sales broken down by hour |
| **Monthly Sales Pie Chart** | Category-level breakdown of revenue for the current month |
| **Sales by Category Chart** | Comparative bar chart across categories |
| **Top Selling Products** | Ranked list of best-performing products |
| **Supplier Schedule Card** | Upcoming delivery schedules from active suppliers |
| **Low Stock Notification Bell** | Real-time push alerts when products drop below reorder point |

---

## 3. Products

**Route:** `/products`

Central catalog management for all items in the system.

### 3.1 Product Attributes

| Field | Notes |
|-------|-------|
| Name, Description (+ additional description) | Displayed on receipts and invoices |
| SKU / Barcode | Unique identifiers; barcode searchable in inventory and POS |
| Category / Subcategory / Brand / Department | Used for markup hierarchy and reporting grouping |
| Unit of Measure (UOM) | e.g., Piece, Box, Kilo |
| Price (Retail) / Cost | Retail price shown in POS; cost used for margin calculations |
| VAT Status | VAT / NON-VAT / Zero-Rated / VAT-Exempt |
| Reorder Point | Triggers low-stock notifications |
| Warehouse Assignment | Products can be linked to a specific warehouse |
| Shelf Location(s) | Multiple shelf assignments with per-shelf quantities |
| Expiration Date | Optional expiry tracking |
| Earns Points | Toggle whether a product earns loyalty points |

### 3.2 Product Family (Parent–Child Hierarchy)

Products support a **three-level parent → child → grandchild** tree for unit conversion:

- A **Bulk** product (e.g., "1 Box of 24 Pcs") is the parent.
- **Pack** and **Retail** products are children with a `conversionFactor`.
- Stock adjustments and purchases applied to a parent are automatically propagated to all family members using recursive family-sync logic.

### 3.3 Price Levels

Multiple pricing tiers (e.g., Wholesale, Dealer, Walk-in) can be configured per product. Each Price Level defines:

- Base calculation (`retail` or `cost`)
- Percentage adjustment
- Optional minimum quantity threshold

### 3.4 Supplier Mapping

A product can be mapped to multiple suppliers with:

- Supplier-specific cost and lead time
- Supplier-specific reorder point (ROP)
- Primary supplier flag

### 3.5 Automatic Markup (Suggested Selling Price)

The **Magic Wand** button on the Purchase Order and Product dialogs calculates a suggested selling price using the formula:

```
Suggested Price = (Cost × (1 + Markup%)) + Shipping Allocation
```

Markup is resolved in priority order (configurable):

1. Subcategory markup
2. Category markup
3. Brand markup
4. Supplier markup
5. Global default markup

### 3.6 Product Views

- **Card View** — visual tile with stock badge, barcode, and action menu
- **Table View** — dense spreadsheet view with barcode column
- **Low Stock Filter** — quick filter showing only items at or below their reorder point

---

## 4. Inventory

**Route:** `/inventory`

### 4.1 Stock Levels

Main inventory grid showing current stock across all products. Supports:

- Card and Table view toggle
- Barcode search
- Bulk stock adjustment (drawer)
- Inline single-product adjustment

### 4.2 Stock Adjustment

Manual stock corrections with the following fields:

| Field | Notes |
|-------|-------|
| Add / Remove tabs | Tabbed interface for increment or decrement |
| Quantity | Amount to add or remove |
| Reason | Dropdown (Damaged, Expired, Found, Correction, etc.) + custom |
| Projected Impact preview | Real-time display of resulting stock level |

Adjustments can be routed through the **Approval Workflow** if `requireAdjustmentConfirmation` is enabled.

### 4.3 Stock Counts (Physical Inventory Snapshots)

A stock count records the physical count of items in the warehouse at a point in time.

**Workflow:**

1. Create a new stock count — the system snapshots the current expected quantities.
2. Cashier / warehouse staff enters the physically-counted quantities.
3. System calculates the **variance** (physical count − expected).
4. Apply the variance to update live stock levels.
5. Optionally send the count through the **Approval Workflow** before applying.

### 4.4 Repackaging (REPACKING)

Converts inventory between product family units.

#### Break Pack (Bulk → Retail)

1. Select the parent/bulk product and quantity to break.
2. System calculates child quantity using `conversionFactor`.
3. Optionally trigger auto-barcode generation and price/cost calculation for the new units.
4. Submit — decrements parent stock, increments child stock.

#### Consolidation (Pack → Bulk)

The reverse workflow — consolidate smaller units back into bulk:

1. Select child/pack product and quantity to consolidate.
2. System calculates resulting bulk quantity.
3. Submit — decrements child stock, increments parent stock.

Both operations can be queued for approval if `requireRepackagingConfirmation` is enabled.

### 4.5 Shelf Board (Drag-and-Drop Shelf Management)

Visual kanban-style board for assigning products to physical shelf locations.

- Each column represents a shelf location.
- Products can be dragged between shelves to reassign stock.
- Multi-select: hold Ctrl to select multiple products, then drag.
- An **Unassigned** column shows products without a shelf location.
- Shelf transfers can be gated behind the Approval Workflow via `requireShelfTransferApproval`.

### 4.6 Transfer Board

Dedicated board for inter-shelf stock transfers with per-product quantity selection.

### 4.7 Adjustment History

Paginated log of all stock adjustment entries with date, reason, quantity change, and who performed the action.

### 4.8 Stock Movement Log

Detailed audit trail of every stock movement (sale, purchase, adjustment, transfer, return) including:

- Product name
- Movement type
- Quantity change (±)
- Previous and new stock levels
- Reference ID and type

---

## 5. Sales

**Route:** `/sales`

### 5.1 POS Sales Transactions

List of all POS transactions with:

- Filters by date range, cashier, terminal, payment method
- Drill-down to transaction detail with line items
- Reprint receipt button
- Void / return actions

### 5.2 Sales by Product / Service

Aggregate sales grouped by product showing:

- Total units sold
- Gross revenue
- VAT breakdown
- Profit margin (when cost data available)

### 5.3 Sales by Date

Date-grouped sales totals — useful for identifying daily/weekly patterns.

### 5.4 Sales Orders

Backoffice-created sales orders (non-POS) with:

- Customer assignment
- Delivery date
- Sales person
- Status management (Pending → To Deliver → Fully Delivered)

### 5.5 Sales Invoice / Delivery

Formal sales invoices linked to orders with:

- Invoice date and due date
- Payment tracking
- Export functionality

### 5.6 Merchandise Credits (Returns)

Processed via the POS Return Dialog or backoffice. Records:

- Returned items and quantities
- Refund method
- Credit slip generation (printable)

### 5.7 Post Void

Post-transaction voids (same-day or next-day) with reason tracking.

### 5.8 POS Z-Reading

Official end-of-day report per terminal. Includes:

- Gross, Net, VAT sales
- Payment method breakdown (Cash, Card, GCash, etc.)
- Transaction range (min/max receipt number)
- Void and return totals
- Running Z-counter total
- BIR-mandated fields: MIN, Serial Number, TIN

### 5.9 POS X-Reading

Mid-shift summary (does not affect Z-counter). Shows current shift totals.

### 5.10 Sales Analysis

- Batch analysis (profit per inventory batch)
- Hourly sales distribution
- Monthly category breakdown
- Top products report

### 5.11 POS Cash Transfer

Records cash pickups (removed from drawer) and deposits (added to drawer) mid-shift.

### 5.12 Management Dialogs (Sales Module)

| Dialog | Purpose |
|--------|---------|
| Manage Customers | Add/edit customer records |
| Manage Payment Methods | Configure tender types |
| Manage Sales Persons | Manage the sales rep list |
| Manage Warehouses | Configure warehouse locations |

---

## 6. Purchases

**Route:** `/purchases`

### 6.1 Purchase Orders

Full purchase order lifecycle:

| Status | Description |
|--------|-------------|
| Draft | Created but not yet sent to supplier |
| Ordered | Sent to supplier; awaiting delivery |
| Partially Received | Some items received |
| Received | Fully received and stock updated |
| Cancelled | Voided PO |

**Key Features:**

- **Add Purchase Order Dialog** — multi-item line entry with cost, discount, and VAT fields
- **Suggested Selling Price (Wand)** — automatic markup calculation per line item
- **Shipping Cost allocation** — spreads shipping fee across items proportionally (landed cost)
- **Receive PO Dialog** — record partial or full receipt; auto-updates product stock
- **Scheduled Orders** — view and manage delivery schedules
- **Print Purchase Order** — thermal or PDF format
- **Export** — CSV export of purchase order data
- **Due Date Auto-calculation** — computes due date from supplier's payment terms + issue date

### 6.2 Bad Orders

Tracks defective, damaged, or wrong-item deliveries linked to a purchase order.

| Field | Notes |
|-------|-------|
| Reason | Damaged / Defective / Expired / Wrong Item / Missing / Other |
| Status | Reported → Return Requested → Replaced / Credited / Resolved |
| Resolution Notes | Free text field for follow-up actions |

Bad order recording can require approval if `requireBadOrderConfirmation` is enabled.

---

## 7. Customers

**Route:** `/customer`

### 7.1 Customer List

Master customer database with:

- Name, contact number, address
- Billing address, TIN
- Assigned sales person, sales area, sales group
- Payment terms and credit limit
- Assigned price level (for automatic tiered pricing at POS)
- SR/PWD and discount flag

### 7.2 Customer Payments

Record payments against outstanding customer invoices/balances.

### 7.3 Customer Balances

Statement of Account (SOA) view per customer showing all outstanding invoices and payments.

### 7.4 Customer Loyalty Points

- Earn points on qualifying POS transactions (configurable per product)
- Point history log
- Manual point adjustment
- Redeem points at POS (configured points-to-currency ratio)
- Loyalty settings: tier thresholds, earning ratio, expiry rules

---

## 8. Suppliers

**Route:** `/suppliers`

### 8.1 Supplier List

Master supplier database with:

- Contact details (name, phone, mobile, email, address)
- Company and TIN
- Payment terms
- Default markup percentage
- Order schedule

### 8.2 Balance to Supplier

Accounts-payable view:

- Outstanding purchase order balances per supplier
- Transaction history (purchases, payments)
- Add transaction / payment from action dropdown

### 8.3 Supplier Payments

Record payments to suppliers against purchase order balances.

- Payment voucher generation (printable)
- Export supplier payment history to CSV

---

## 9. Approvals Board

**Access:** Sidebar drawer (Management section)

A Kanban-style workflow board for multi-level authorizations.

### 9.1 Supported Approval Types

| Type | Trigger |
|------|---------|
| Stock Adjustment | Toggled in POS Setup settings |
| Stock Count | Toggled in POS Setup settings |
| Purchase Order | Toggled in POS Setup settings |
| Receive PO | Toggled in POS Setup settings |
| Bad Order | Toggled in POS Setup settings |
| Repackaging (Break Pack / Consolidation) | Toggled in POS Setup settings |
| Shelf Transfer | Toggled in POS Setup settings |

### 9.2 Workflow

```
Submitted → Level 1 Review → Level 2 Review (optional) → Approved → Finalized
                                                         └─────────→ Rejected
```

### 9.3 Workflow Settings

Configuring approval levels, approver assignments, and which transaction types require approval.

---

## 10. Reports

**Route:** `/reports`

| Report | Description |
|--------|-------------|
| **Inventory Report** | Current stock value by product |
| **Stock Adjustments** | History of all manual adjustments |
| **Stock Movements** | Full audit trail of inventory changes |
| **Low Stock Report** | Products at or below reorder point |
| **Purchase Report by Product** | Quantities and cost by product |
| **Purchase Report by Supplier** | Spend analysis per supplier |
| **Sales Velocity** | Units sold per day / week for forecasting |
| **Batch Profit Report** | Profit calculated per inventory batch |
| **Statement of Account (SOA)** | Customer or supplier SOA export |

---

## 11. User Management

**Route:** `/user-management`

### 11.1 Users

- Add/Edit/Deactivate users
- Assign user type (drives permission set)
- Password management (bcrypt hashed)

### 11.2 User Types & Permissions

Built-in roles:

| Role | Default Access |
|------|---------------|
| **Super Admin** | All permissions (bypasses all checks) |
| **Admin** | Full backoffice; POS admin actions |
| **Manager** | Inventory, sales, purchases, reports |
| **Cashier** | POS terminal only (redirected automatically) |

Custom user types can be created with granular permission toggles for each module.

### 11.3 Permission List

```
view_dashboard         manage_products        manage_inventory
view_sales             manage_customers       manage_purchases
manage_suppliers       view_approvals         manage_approval_settings
view_reports           manage_users           manage_settings
access_pos             super_admin
```

---

## 12. Settings

**Route:** `/settings`

### 12.1 POS Setup (`/settings/pos-setup`)

The main configuration page for operational behavior.

#### Business Profile
- Business name, operated-by, address, contact, TIN, email
- Upload business logo (PNG/JPG, max 2MB) for receipt header

#### Printer Configuration
- **Paper size**: 58mm (standard) or 80mm (wide)
- **Print mode**: Browser Print (installed driver) or Native DLL (Windows Spooler)
- **Native printer selection**: Scan and select from installed Windows printers
- **Print two receipts**: Duplicate copy option

#### General Settings
- Show quantity in POS product search
- Allow negative inventory (sell even when out of stock)

#### Transaction Confirmations (Approval Gates)

Each toggle enables routing that transaction type through the Approval Workflow:

| Toggle | Transaction Type |
|--------|----------------|
| Stock Adjustment Confirmation | Manual stock adjustments |
| Stock Transfer Confirmation | Shelf-to-shelf transfers |
| Purchase Order Confirmation | New purchase orders |
| Receive PO Confirmation | PO receipt |
| Bad Order Confirmation | Bad order recording |
| Stock Count Approval | Physical inventory counts |
| Repackaging Approval | Break pack / consolidation |
| Shelf Transfer Approval | Shelf board movements |

#### Batch Costing Policy

| Setting | Description |
|---------|-------------|
| Inherit Batch Cost When Repacking | Child batch cost = parent cost ÷ conversion factor |
| Block Sale When Batch Stock Exhausted | Prevents overselling beyond tracked batch quantity |

#### BIR Compliance (RMO 24-2023)
- **Training Mode** — tag transactions as training; excluded from Z-reading totals
- **MIN / Serial Number** fields for fiscal compliance
- **Transaction prefix** configuration

#### Authentication Guards

Per-action PIN protection (username + password):

- Line void auth
- Void / return auth
- Recent sales auth
- Price edit auth
- Tax rates auth
- Cash count auth

#### POS Terminals
- Register multiple physical terminals
- Each terminal has its own Z-counter, serial number, and MIN
- Terminal-specific receipt settings (OR number sequence, print official receipt toggle)

#### Sales Persons
Manage the list of sales representatives assignable to customers and orders.

#### Payment Terms
Manage supplier/customer payment terms (e.g., Net 30, COD).

#### Transaction References
Configure OR number / transaction reference sequences per terminal.

### 12.2 Pricing (`/settings/pricing`)

- Manage **Price Levels** (Wholesale, Dealer, Walk-in, etc.)
- Set base calculation method (retail or cost)
- Set percentage adjustment and minimum quantity per level

### 12.3 Tax Rates (`/settings/tax-rates`)

- Add or edit tax rates (name, percentage)
- Set a default tax rate applied automatically to new products

### 12.4 Appearance (`/settings/appearance`)

Theme configuration (light/dark mode and primary color).

### 12.5 Notifications (`/settings/notifications`)

- Enable/disable push notifications for low stock alerts
- Notification polling interval

### 12.6 Data Management (`/settings/data-management`)

| Feature | Description |
|---------|-------------|
| **Export Products** | Download CSV of entire product catalog |
| **Import Products** | Upload CSV to bulk-create or update products |
| **Export Customers** | Download customer list CSV |
| **Import Customers** | Bulk-import customers from CSV |
| **Backup** | Manual and scheduled database backups |
| **Restore** | Restore from a previous backup file |
| **Reset** | Full data reset (requires confirmation) |

### 12.7 External API (`/settings/external-api`)

- Configure outbound API endpoint for syncing data to external systems
- View webhook delivery logs with retry functionality
- Test connection

### 12.8 System (`/settings/system`)

- Database connection configuration
- Migration runner
- Developer tools
