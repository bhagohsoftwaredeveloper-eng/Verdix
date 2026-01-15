@echo off
echo Resetting MySQL Root Password
echo ==============================

echo Step 1: Stopping MySQL service...
net stop mysql80
if %errorlevel% neq 0 (
    echo Failed to stop MySQL service. You may need to run as Administrator.
    pause
    exit /b 1
)

echo Step 2: Starting MySQL in safe mode...
echo.
echo MySQL will start in safe mode. Do not close this window.
echo In another command prompt, run the connection script.
echo Press Ctrl+C to stop when done.

"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld" --defaults-file="C:\Program Files\MySQL\MySQL Server 8.0\my.ini" --skip-grant-tables --console

echo.
echo MySQL has stopped.
echo Restarting normal service...
net start mysql80

pause
