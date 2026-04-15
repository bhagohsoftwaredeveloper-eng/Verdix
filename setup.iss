; Stock Pilot Inno Setup Script
#define AppName "Stock Pilot"
#define AppVersion "1.0.0"
#define AppPublisher "JhazonE"
#define AppURL "https://github.com/JhazonE/Stock_Pilot"
#define AppExeName "StockPilot.exe"

[Setup]
AppId={{D3F73FF9-A96F-4F5C-9E2B-62972F84B373}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppProvider={#AppPublisher}
AppSupportURL={#AppURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DisableProgramGroupPage=yes
OutputBaseFilename=StockPilotSetup
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; These would be the files generated after 'npm run build' and 'electron-builder'
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "establish_mysql_connection.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_mysql.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprogramgroups}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
; Run the database setup script after installation
Filename: "{app}\establish_mysql_connection.bat"; Description: "Setup MySQL Database"; Flags: runascurrentuser waituntilterminated

; Launch the app
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Optional: stop services on uninstall
; Filename: "{cmd}"; Parameters: "/C pm2 stop stock-pilot && pm2 delete stock-pilot"; Flags: runhidden
