@echo off
echo ╔════════════════════════════════════════════════════════╗
echo ║  Initialisation du système de paramétrage             ║
echo ╚════════════════════════════════════════════════════════╝
echo.

node database\init-parametrage.js

echo.
echo Appuyez sur une touche pour continuer...
pause > nul
