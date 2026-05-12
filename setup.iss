; Stock Pilot Inno Setup Script
#define AppName "Stock Pilot"
#define AppVersion "1.11"
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
OutputBaseFilename=StockPilotSetup_{#AppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; App Files
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".env"; DestDir: "{app}"; Flags: ignoreversion
Source: "establish_mysql_connection.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_mysql.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "start_server.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "C:\Program Files\nodejs\node.exe"; DestDir: "{app}"; Flags: ignoreversion

; Next.js Standalone Files
Source: ".next\standalone\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "backups\*"
Source: ".next\static\*"; DestDir: "{app}\.next\static"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs


[Icons]
Name: "{autoprograms}\Stock Pilot POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""
Name: "{autodesktop}\Stock Pilot POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""; Tasks: desktopicon
Name: "{userstartup}\Stock Pilot POS"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/pos --role=""POS Terminal"""
Name: "{userstartup}\Stock Pilot Server"; Filename: "{app}\start_server.bat"; Flags: runminimized

Name: "{autoprograms}\Stock Pilot Backoffice"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/dashboard --role=""Admin Dashboard"""
Name: "{autodesktop}\Stock Pilot Backoffice"; Filename: "{app}\{#AppExeName}"; Parameters: "--route=/dashboard --role=""Admin Dashboard"""; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"
