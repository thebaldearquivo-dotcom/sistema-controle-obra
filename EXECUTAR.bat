@echo off
setlocal
title Executar - Sistema Controle de Obra V4
cd /d "%~dp0"

echo ================================================
echo   SISTEMA CONTROLE DE OBRA V4 - PORTA 3005
echo ================================================
echo.

if not exist "node_modules" (
  echo A pasta node_modules nao foi encontrada.
  echo Rode primeiro o arquivo INSTALAR.bat.
  echo.
  pause
  exit /b 1
)

echo Abrindo o sistema no navegador...
start "" "http://localhost:3005"
echo.
echo Iniciando servidor local...
echo Para parar o sistema, pressione CTRL + C neste terminal.
echo.

call npm run dev

pause
