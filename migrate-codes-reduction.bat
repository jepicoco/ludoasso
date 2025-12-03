@echo off
echo ============================================
echo Migration des codes de reduction
echo ============================================
echo.

cd /d W:\ludo\ludotheque
node database\migrations\addCodesReduction.js

echo.
pause
