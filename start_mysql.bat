@echo off
cd /d "C:\Program Files\MySQL\MySQL Server 8.0\bin"
mysqld --skip-grant-tables --console --port=3307
pause
