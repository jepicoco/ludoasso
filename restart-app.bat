@echo off
cd /d W:\ludo\ludotheque
echo Stopping existing node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo Starting application...
npm run dev
