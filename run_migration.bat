@echo off
cd /d "%~dp0"
".\node.exe" migrate.js
exit /b %errorlevel%
