# Giya sa Pag-install sa verdix v1.8

Kini nga giya mag-tudlo kanimo kung unsaon pag-install sa verdix POS (Version 1.8) ug ang mga kinahanglanon niini.

---

## 1. Mga Kinahanglanon (Prerequisites)

Tungod kay gi-bundle na nato ang **Node.js** sa sulod sa installer, mas dyutay nalang ang kinahanglan nimo i-andam:

1.  **Operating System**: Windows 10 or Windows 11.
2.  **MySQL Server**: 
    *   Kinahanglan naay naka-install nga MySQL server sa computer (or sa local network).
    *   Kinahanglan naga-andar kini sa port **`3306`**.
    *   Kinahanglan naa kay database nga gingalan ug **`verdix`** (or unsa mang ngalana nga naa sa imong `.env`).
    *   Kinahanglan naka-import na ang imong mga tables (schema).
3.  **Printer (Optional para sa POS)**: Driver sa imong POS thermal printer kung mag-print ka ug resibo.

---

## 2. Mga Lakang sa Pag-install (Installation Steps)

### Lakang 1: Pag-run sa Installer
1.  I-double click ang file nga **`verdixSetup_1.8.exe`**.
2.  Kung mugawas ang Windows SmartScreen (kay wala may digital sign), i-click ang **More Info** -> **Run Anyway**.

### Lakang 2: Sunda ang Setup Wizard
1.  Pilia ang folder diin nimo gusto i-install (by default naa sa `C:\Program Files (x86)\verdix`).
2.  I-check ang option kung gusto nimo mag-butang ug Shortcut sa Desktop.
3.  I-click ang **Install**.

### Lakang 3: Human sa Pag-install (Post-Installation)
1.  Inig human ug install, **awtomatiko** nga mag-himo ug shortcut ang installer sa **Windows Startup folder**.
2.  Inig restart nimo sa computer (or inig human install), mo-andar diretso ang:
    *   **Next.js Server** (sa background).
    *   **verdix POS** application.

---

## 3. Pag-set up sa Koneksyon

1.  I-siguro nga naga-andar ang imong **MySQL Server**.
2.  I-open ang application.
3.  Kung gusto nimo i-connect kini sa imong **Railway Central Server**:
    *   Adto sa **Settings** -> **External API**.
    *   Ibutang ang imong Railway URL sa **API Endpoint**.
    *   I-save ug i-enable!

*Karon, andam na ang imong POS nga makabaligya bisan offline, ug mag-sync sa data inig naa nay internet!*
