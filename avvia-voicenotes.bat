@echo off
title VoiceNotes
cd /d "%~dp0"
echo ============================================
echo  VoiceNotes - Registratore AI
echo ============================================
echo.

rem La porta deve essere sempre la 4000: su un'altra porta il browser apre
rem un archivio diverso e l'app sembra aver perso chiavi e note.
netstat -ano | findstr /R /C:":4000 .*LISTENING" >nul
if not errorlevel 1 (
  echo ATTENZIONE: la porta 4000 e' gia' occupata.
  echo.
  echo Se VoiceNotes e' gia' aperto in un'altra finestra, usa quella:
  echo   https://localhost:4000
  echo.
  echo Altrimenti chiudi il programma che usa la porta 4000 e riprova.
  echo Non avvio una seconda copia su un'altra porta, perche' li'
  echo l'app sembrerebbe vuota, senza chiavi e senza note.
  echo.
  pause
  exit /b 1
)

echo Avvio in corso... non chiudere questa finestra.
echo.
echo Dal PC:       https://localhost:4000
echo Dal telefono: https://IP-DEL-PC:4000
echo   (l'indirizzo esatto compare qui sotto tra poco;
echo    al primo accesso dal telefono accetta l'avviso
echo    sul certificato: serve per usare il microfono)
echo.
echo Usa sempre lo stesso indirizzo: chiavi e note sono salvate
echo separatamente per ogni indirizzo.
echo.
set VOICENOTES_HTTPS=1
call npm run dev
pause
