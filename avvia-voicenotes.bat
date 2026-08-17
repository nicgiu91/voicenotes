@echo off
title VoiceNotes
cd /d "%~dp0"
echo ============================================
echo  VoiceNotes - Registratore AI
echo ============================================
echo.
echo Avvio in corso... non chiudere questa finestra.
echo.
echo Dal PC:       https://localhost:4000
echo Dal telefono: https://IP-DEL-PC:4000
echo   (l'indirizzo esatto compare qui sotto tra poco;
echo    al primo accesso dal telefono accetta l'avviso
echo    sul certificato: serve per usare il microfono)
echo.
set VOICENOTES_HTTPS=1
call npm run dev
pause
