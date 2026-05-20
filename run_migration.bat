@echo off
cd /d "%~dp0"
".\node.exe" init_database.js
if %errorlevel% neq 0 exit /b %errorlevel%
".\node.exe" migrate.js
exit /b %errorlevel%
