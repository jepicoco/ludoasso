@echo off
cd /d W:\ludo\ludotheque
echo Running migrations...
node database\migrations\addEventTriggers.js
echo.
echo Running seeds...
node database\seeds\seedEventTriggers.js
echo.
echo Done!
