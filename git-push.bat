@echo off
echo ======================================
echo Push du projet Ludotheque sur GitHub
echo ======================================
echo.

REM Configuration Git (modifiez avec votre email GitHub)
git config user.name "epicoco"
git config user.email "votre-email@github.com"

echo Configuration Git OK
echo.

REM Ajout de tous les fichiers
echo Ajout des fichiers...
git add .
echo.

REM Vérification du statut
echo Statut Git :
git status
echo.

REM Demander confirmation
set /p confirm="Voulez-vous commiter ces fichiers ? (O/N) : "
if /i not "%confirm%"=="O" (
    echo Annulation...
    exit /b
)

REM Commit
echo.
echo Création du commit...
git commit -m "Initial commit - Application Ludotheque complete avec systeme de communication"
echo.

REM Demander l'URL du dépôt GitHub
echo.
echo Maintenant, vous devez creer un depot sur GitHub si ce n'est pas deja fait :
echo 1. Allez sur https://github.com/new
echo 2. Creez un nouveau depot (par exemple : ludotheque)
echo 3. NE PAS initialiser avec README, .gitignore ou licence
echo.
set /p repo_url="Entrez l'URL du depot GitHub (ex: https://github.com/epicoco/ludotheque.git) : "

if "%repo_url%"=="" (
    echo Erreur : URL du depot vide
    exit /b
)

REM Ajout du remote
echo.
echo Ajout du remote GitHub...
git remote add origin %repo_url%
echo.

REM Push vers GitHub
echo Push vers GitHub...
git branch -M main
git push -u origin main
echo.

echo ======================================
echo Push terminé !
echo ======================================
echo.
echo Votre projet est maintenant sur GitHub : %repo_url%
echo.

pause
