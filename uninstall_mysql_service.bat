@echo off
echo Stopping VerdixMySQL service...
net stop VerdixMySQL >nul 2>&1

echo Removing VerdixMySQL service...
sc delete VerdixMySQL >nul 2>&1

echo MySQL service removed.
exit /b 0
