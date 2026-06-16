@echo off
start /B node C:\life-os\server\index.js
start /B /D C:\life-os\client npx vite --port 5173 --host
echo Started
