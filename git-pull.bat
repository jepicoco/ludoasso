@echo off
echo ======================================
echo Pull du projet depuis GitHub
echo ======================================
echo.

REM Vérifier qu'on est dans un dépôt Git
git status >nul 2>&1
if errorlevel 1 (
    echo Erreur : Ce n'est pas un depot Git !
    echo Executez d'abord git-push.bat pour initialiser le depot.
    pause
    exit /b
)

REM Vérifier les modifications locales
echo Verification des modifications locales...
git status
echo.

set /p confirm="Des fichiers modifies localement peuvent etre ecrases. Continuer ? (O/N) : "
if /i not "%confirm%"=="O" (
    echo Annulation...
    exit /b
)

REM Récupérer les dernières modifications
echo.
echo Recuperation des modifications depuis GitHub...
git pull origin main
echo.

if errorlevel 1 (
    echo.
    echo ======================================
    echo Erreur lors du pull !
    echo ======================================
    echo.
    echo Possibles causes :
    echo - Conflits entre les versions locale et distante
    echo - Probleme de connexion
    echo - Depot distant non configure
    echo.
    echo Commandes utiles :
    echo   git status          : voir l'etat actuel
    echo   git log --oneline   : voir l'historique
    echo   git remote -v       : voir les remotes configures
    echo.
) else (
    echo.
    echo ======================================
    echo Pull termine avec succes !
    echo ======================================
    echo.
)

pause
