; Vendix Inno Setup Script
#define AppName "Vendix"
#define AppVersion "1.14"
#define AppPublisher "BHAGOH SYSTEMS"
#define AppExeName "verdix.exe"

[Setup]
AppId={{D3F73FF9-A96F-4F5C-9E2B-62972F84B373}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DisableProgramGroupPage=yes
SetupIconFile=public\verdix_logo.ico
OutputBaseFilename=VendixSetup_{#AppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableFinishedPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Dirs]
; License store — lives OUTSIDE {app} so it survives uninstall/updates.
; Pre-created with user-modify rights so the POS server (running as the
; logged-in user) can write C:\ProgramData\Verdix\license.dat after activation.
Name: "{commonappdata}\Verdix"; Permissions: users-modify

[Files]
; App Files
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion
Source: "establish_mysql_connection.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_mysql.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_server.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "migrate.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "init_database.js"; DestDir: "{app}"; Flags: ignoreversion
Source: "schema.sql"; DestDir: "{app}"; Flags: ignoreversion
Source: "run_migration.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Program Files\nodejs\node.exe"; DestDir: "{app}"; Flags: ignoreversion

; Next.js Standalone Files
Source: ".next\standalone\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "backups\*"
Source: ".next\static\*"; DestDir: "{app}\.next\static"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs


[Icons]
Name: "{autoprograms}\Vendix POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; IconFilename: "{app}\public\verdix_logo.ico"
Name: "{autodesktop}\Vendix POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; IconFilename: "{app}\public\verdix_logo.ico"
Name: "{userstartup}\Vendix POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; IconFilename: "{app}\public\verdix_logo.ico"
Name: "{commonstartup}\Vendix Server"; Filename: "{app}\start_server.bat"; Flags: runminimized


[Run]
Filename: "{app}\run_migration.bat"; Flags: runhidden waituntilterminated
Filename: "{app}\{#AppExeName}"; Flags: nowait skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
