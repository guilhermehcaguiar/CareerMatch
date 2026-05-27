@echo off
title Painel de Controle - CareerMatch Engine
cls

for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do set "ESC=%%b"

set "AZUL=%ESC%[94m"
set "VERDE=%ESC%[92m"
set "AMARELO=%ESC%[93m"
set "VERMELHO=%ESC%[91m"
set "RESET=%ESC%[0m"
set "NEGRITO=%ESC%[1m"

echo.
echo %AZUL%%NEGRITO%=====================================================================%RESET%
echo %AZUL%%NEGRITO%   INICIALIZADOR INTELIGENTE - CAREERMATCH ENGINE%RESET%
echo %AZUL%%NEGRITO%=====================================================================%RESET%
echo.

:: --- CONFIGURAÇÃO DO BACKEND ---
echo %AZUL%[1/4] Verificando ambiente virtual do Python (backend)...%RESET%
cd backend

if not exist venv (
    echo %AMARELO%[AVISO] venv nao encontrada! Criando ambiente virtual...%RESET%
    python -m venv venv
    echo %VERDE%[OK] Ambiente venv criado com sucesso.%RESET%
) else (
    echo %VERDE%[OK] Ambiente venv detectado.%RESET%
)

echo %AZUL%[2/4] Verificando e instalando dependencias do Python...%RESET%
call venv\Scripts\activate
echo %AZUL%[status] Certificando pacotes essenciais instalados...%RESET%
pip install fastapi uvicorn pydantic neo4j bcrypt pyjwt python-dotenv --quiet
echo %VERDE%[OK] Backend preparado para execucao.%RESET%
cd ..
echo.

:: --- CONFIGURAÇÃO DO FRONTEND ---
echo %AZUL%[3/4] Verificando dependencias do React (frontend)...%RESET%
cd frontend

if not exist node_modules (
    echo %AMARELO%[AVISO] node_modules nao encontrada! Instalando pacotes do npm...%RESET%
    call npm install
    echo %VERDE%[OK] Pacotes instalados com sucesso.%RESET%
) else (
    echo %VERDE%[OK] node_modules detectada.%RESET%
)
cd ..
echo.

:: --- INICIALIZAÇÃO DOS SERVIDORES ---
echo %AZUL%[4/4] Inicializando os servidores...%RESET%
echo.

:: Liga o FastAPI escutando em 0.0.0.0
start "Backend - FastAPI" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Pausa curta para o Python estabilizar a escuta das portas
timeout /t 2 /nobreak > nul

:: Liga o React (Vite)
start "Frontend - React" cmd /k "cd frontend && npm run dev"

:: Aguarda o carregamento do layout final
timeout /t 2 /nobreak > nul

:: Dispara o navegador na porta padrão do frontend do Vite
start http://localhost:5173

echo.
echo %AZUL%%NEGRITO%=====================================================================%RESET%
echo %VERDE%%NEGRITO%   [SISTEMA ONLINE] CareerMatch rodando em http://localhost:5173%RESET%
echo %AZUL%%NEGRITO%=====================================================================%RESET%
echo.
pause