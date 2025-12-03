@echo off
echo ========================================
echo Git Push vers ludoasso
echo ========================================
echo.

cd /d W:\ludo\ludotheque

echo [1/6] Configuration Git...
git config user.name "epicoco"
git config user.email "epicoco@ludoasso.local"
echo OK
echo.

echo [2/6] Ajout des fichiers...
git add .
echo OK
echo.

echo [3/6] Creation du commit...
git commit -m "Initial commit - Application Ludotheque complete avec systeme de gestion, emprunts, cotisations et communications"
echo.

echo [4/6] Ajout du remote GitHub...
git remote remove origin 2>nul
git remote add origin https://github.com/jepicoco/ludoasso.git
echo OK
echo.

echo [5/6] Renommage de la branche en main...
git branch -M main
echo OK
echo.

echo [6/6] Push vers GitHub...
git push -u origin main
echo.

if errorlevel 1 (
    echo.
    echo ERREUR lors du push
    echo.
    echo Verifiez que :
    echo - Le depot https://github.com/epicoco/ludoasso.git existe
    echo - Vous etes authentifie avec GitHub
    echo - Vous avez les droits d'ecriture
    echo.
) else (
    echo.
    echo ========================================
    echo SUCCES !
    echo ========================================
    echo.
    echo Votre projet est maintenant sur :
    echo https://github.com/jepicoco/ludoasso
    echo.
)

pause
