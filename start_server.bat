@echo off
cd /d "%~dp0"

:: Ensure VerdixMySQL service is running before starting the app server
sc query VerdixMySQL | findstr /C:"RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting VerdixMySQL service...
    net start VerdixMySQL >nul 2>&1
    timeout /t 8 /nobreak >nul
)

echo Starting Vendix Server...
".\node.exe" server.js
