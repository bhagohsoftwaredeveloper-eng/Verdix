; LJMA Supermarket Inno Setup Script
#define AppName "LJMA SUPERMARKET"
#define AppVersion "1.12"
#define AppPublisher "JhazonE"
#define AppURL "https://github.com/JhazonE/Stock_Pilot"
#define AppExeName "Stock Pilot.exe"

[Setup]
AppId={{D3F73FF9-A96F-4F5C-9E2B-62972F84B373}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DisableProgramGroupPage=yes
OutputBaseFilename=LJMASupermarketSetup_{#AppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableFinishedPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
; App Files
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion
Source: "establish_mysql_connection.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_mysql.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_server.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "migrate.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "run_migration.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Program Files\nodejs\node.exe"; DestDir: "{app}"; Flags: ignoreversion

; Next.js Standalone Files
Source: ".next\standalone\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "backups\*"
Source: ".next\static\*"; DestDir: "{app}\.next\static"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs


[Icons]
Name: "{autoprograms}\LJMA SUPERMARKET POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; IconFilename: "{app}\public\ljma_logo.ico"
Name: "{autodesktop}\LJMA SUPERMARKET POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; IconFilename: "{app}\public\ljma_logo.ico"
Name: "{userstartup}\LJMA SUPERMARKET POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; IconFilename: "{app}\public\ljma_logo.ico"
Name: "{userstartup}\LJMA SUPERMARKET Server"; Filename: "{app}\start_server.bat"; Flags: runminimized


[Run]
Filename: "{app}\run_migration.bat"; Flags: runhidden waituntilterminated
Filename: "{app}\{#AppExeName}"; Flags: nowait skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
