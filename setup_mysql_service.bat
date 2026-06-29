@echo off
setlocal EnableDelayedExpansion

set "MYSQL_DIR=%~dp0mysql"
set "MYSQL_BIN=%MYSQL_DIR%\bin"
set "DATA_DIR=C:\ProgramData\Verdix\mysql-data"
set "LOG_FILE=C:\ProgramData\Verdix\mysql-setup.log"
set "INI_FILE=%MYSQL_DIR%\my.ini"

echo [%date% %time%] Starting MySQL setup... >> "%LOG_FILE%"

:: ── Already installed? Just start and exit ────────────────────────────────────
sc query VerdixMySQL >nul 2>&1
if %errorlevel% equ 0 (
    echo [%date% %time%] VerdixMySQL service already exists, ensuring it is running. >> "%LOG_FILE%"
    net start VerdixMySQL >nul 2>&1
    echo [ok] MySQL service already installed.
    goto :run_migrations
)

:: ── First-time install ────────────────────────────────────────────────────────

:: Create data directory
if not exist "%DATA_DIR%" (
    mkdir "%DATA_DIR%"
    echo [%date% %time%] Created data directory: %DATA_DIR% >> "%LOG_FILE%"
)

:: Write my.ini using forward slashes (MySQL requirement on Windows)
set "INI_DATADIR=%DATA_DIR:\=/%"
set "INI_BASEDIR=%MYSQL_DIR:\=/%"

(
    echo [mysqld]
    echo basedir=%INI_BASEDIR%
    echo datadir=%INI_DATADIR%
    echo port=3306
    echo character-set-server=utf8mb4
    echo collation-server=utf8mb4_0900_ai_ci
    echo default-authentication-plugin=mysql_native_password
    echo [client]
    echo port=3306
    echo default-character-set=utf8mb4
) > "%INI_FILE%"
echo [%date% %time%] Wrote my.ini >> "%LOG_FILE%"

:: Initialize the data directory (creates root@localhost with no password)
echo Initializing MySQL data directory...
"%MYSQL_BIN%\mysqld.exe" --defaults-file="%INI_FILE%" --initialize-insecure --console >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] mysqld --initialize-insecure failed. Check %LOG_FILE%
    echo [%date% %time%] FAIL: initialize-insecure returned %errorlevel% >> "%LOG_FILE%"
    exit /b 1
)
echo [%date% %time%] Data directory initialized. >> "%LOG_FILE%"

:: Install as Windows service
"%MYSQL_BIN%\mysqld.exe" --install VerdixMySQL --defaults-file="%INI_FILE%"
if %errorlevel% neq 0 (
    echo [FAIL] mysqld --install failed. Check %LOG_FILE%
    echo [%date% %time%] FAIL: install service returned %errorlevel% >> "%LOG_FILE%"
    exit /b 1
)
echo [%date% %time%] Service installed. >> "%LOG_FILE%"

:: Start the service
net start VerdixMySQL
if %errorlevel% neq 0 (
    echo [FAIL] Could not start VerdixMySQL service. Check %LOG_FILE%
    echo [%date% %time%] FAIL: net start returned %errorlevel% >> "%LOG_FILE%"
    exit /b 1
)
echo [%date% %time%] Service started. >> "%LOG_FILE%"

:: Wait for MySQL to fully initialize (first boot can be slow)
echo Waiting for MySQL to be ready...
timeout /t 10 /nobreak >nul

:: Set root password to match .env (DB_PASSWORD=rootpassword)
"%MYSQL_BIN%\mysql.exe" -u root --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'rootpassword'; FLUSH PRIVILEGES;" >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Could not set root password — MySQL may still be starting. Retrying in 10s...
    echo [%date% %time%] WARN: set password failed, retrying... >> "%LOG_FILE%"
    timeout /t 10 /nobreak >nul
    "%MYSQL_BIN%\mysql.exe" -u root --connect-expired-password -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'rootpassword'; FLUSH PRIVILEGES;" >> "%LOG_FILE%" 2>&1
)
echo [%date% %time%] Root password set. >> "%LOG_FILE%"

:run_migrations
:: ── Run database init + migrations ───────────────────────────────────────────
echo Running database initialization and migrations...
call "%~dp0run_migration.bat"
if %errorlevel% neq 0 (
    echo [FAIL] Database migration failed. Check %LOG_FILE%
    echo [%date% %time%] FAIL: run_migration.bat returned %errorlevel% >> "%LOG_FILE%"
    exit /b 1
)

echo [%date% %time%] Setup complete. >> "%LOG_FILE%"
echo [ok] MySQL setup and database initialization complete.
exit /b 0
