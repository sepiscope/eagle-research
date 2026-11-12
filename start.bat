@echo off
title EagleResearch - local preview
echo ========================================================
echo   Starting EagleResearch at http://localhost:3000
echo   Only this computer can see it. Close this window to stop.
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
pause
