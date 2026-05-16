# StockPilot — Installation & Setup Guide

## Requirements

| Requirement | Minimum Version |
|------------|----------------|
| Node.js | 20.x LTS |
| npm | 10.x |
| PostgreSQL | 15+ |
| Windows | 10 / 11 (for Electron / printer DLL) |
| RAM | 4 GB (8 GB recommended) |
| Disk | 2 GB free space |

> **Note:** The web admin dashboard runs on any platform (Windows, macOS, Linux) because it is a standard Next.js app. The Electron POS terminal and native printer DLL features are **Windows-only**.

---

## 1. Clone / Extract the Project

```bash
# If using Git
git clone <repo-url> Stock_Pilot
cd Stock_Pilot
```

Or extract the project archive into a folder of your choice.

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure the Environment

Create a `.env` file in the project root:

```env
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/stock_pilot"

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Set Up PostgreSQL

### 4.1 Run Migrations

```bash
npx prisma migrate dev --name init
```

This sets up the schema and runs initial migrations.

### 4.2 Seed Initial Data (Optional)

```bash
npm run seed
```

Populates default payment methods, tax rates, and a sample admin user.

### 4.4 Create the Super Admin

```bash
npm run set-admin
```

Follow the prompts to set a username and password for the first admin account.

---

## 5. Start the Application

### Web Admin Dashboard Only

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

### POS Terminal Only (Electron)

The dev server must already be running on port 3000.

```bash
npm run electron-only
```

### Both (Admin + POS) Simultaneously

```bash
npm run electron-dev
```

This uses `concurrently` to start the Next.js dev server and — once it's ready — launches the Electron POS window.

### Admin Dashboard in Electron Window

```bash
npm run electron-admin-dev
```

---

## 6. Configure POS Settings

Once logged in to the admin dashboard:

1. Go to **Settings → POS Setup**
2. Fill in your **Business Name**, Address, TIN, and Contact Number
3. Upload your **Business Logo** (shown on receipts)
4. Choose your **Paper Size** (58mm or 80mm) and **Print Mode**
5. Register at least one **POS Terminal** under the Terminals section
6. Configure **Transaction References** (OR number starting sequence)

---

## 7. Printer Setup

### Option A: Browser Print (Installed Driver)

1. Install the thermal printer's Windows driver.
2. In POS Setup, set **Print Mode** to `Use Installed Driver (Browser Print)`.
3. On first print, select the thermal printer in the browser print dialog.

### Option B: Native DLL (Recommended for Production)

1. Install the thermal printer's Windows driver.
2. In POS Setup, set **Print Mode** to `Native (DLL) Printer`.
3. Click **Scan Printers** — select your printer from the list.
4. The system will use the Windows Print Spooler directly (no browser dialog).

---

## 8. Building the Installer (Production)

```bash
# Build the Next.js production bundle
npm run build

# Build the Electron portable installer
npm run dist
```

Output will be in the `dist/` directory as a `.exe` portable file.

### Using Inno Setup (Optional)

```bash
npm run build:installer
```

Requires [Inno Setup](https://jrsoftware.org/isinfo.php) to be installed.

---

## 9. Backup & Restore

### Manual Backup

Go to **Settings → Data Management → Backup** and click **Manual Backup**.

Backups are saved as SQL dump files in the `backups/` directory.

### Scheduled Backup

Configure the schedule under **Settings → Data Management → Backup Schedule**.

### Restore

In **Settings → Data Management**, click **Restore** and select a backup file.

---

## 10. Troubleshooting

| Problem | Solution |
|---------|---------|
| `ECONNREFUSED` on startup | PostgreSQL is not running. Start PostgreSQL service. |
| Blank POS window | Ensure `npm run dev` is running on port 3000 before launching Electron. |
| Printer not found | In Native mode, click "Scan Printers". Ensure driver is installed. |
| Login redirect loop | Clear `localStorage` in browser devtools (`localStorage.clear()`). |
| Migration errors | Run `npm run migrate:down` then `npm run migrate` to re-apply. |

---

## 11. Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start Next.js in development mode (Turbopack) |
| Build | `npm run build` | Production Next.js build |
| Start (prod) | `npm run start` | Start production server |
| Lint | `npm run lint` | ESLint check |
| Typecheck | `npm run typecheck` | TypeScript type check |
| Seed | `npm run seed` | Seed database with defaults |
| Migrate up | `npx prisma migrate dev` | Apply pending migrations |
| Migrate reset | `npx prisma migrate reset` | Reset and re-run all migrations |
| Set admin | `npm run set-admin` | Create or update super admin user |
| POS Electron | `npm run electron-only` | Launch POS Electron window only |
| Admin Electron | `npm run electron-admin` | Launch admin Electron window only |
| Both + Dev | `npm run electron-dev` | Dev server + POS Electron window |
| Build installer | `npm run dist` | Build Windows portable .exe |
