@echo off
setlocal
title Instalar - Sistema Controle de Obra V4
cd /d "%~dp0"

echo ================================================
echo   INSTALADOR - SISTEMA CONTROLE DE OBRA V4
echo ================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado.
  echo Instale o Node.js antes de continuar.
  echo Baixe em: https://nodejs.org/
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm nao encontrado.
  echo Reinstale o Node.js marcando a opcao npm.
  echo.
  pause
  exit /b 1
)

echo Node encontrado:
node -v
echo.

echo npm encontrado:
call npm -v
echo.

echo Instalando dependencias do sistema...
echo Isso pode demorar alguns minutos na primeira instalacao.
echo.

call npm install

if errorlevel 1 (
  echo.
  echo ERRO: A instalacao falhou.
  echo Verifique a mensagem acima e tente novamente.
  echo.
  pause
  exit /b 1
)

echo.
echo ================================================
echo   INSTALACAO CONCLUIDA COM SUCESSO!
echo ================================================
echo.
echo Agora execute o arquivo EXECUTAR.bat para abrir o sistema.
echo.
pause
