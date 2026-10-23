@echo off
set VITE_PATH=C:\Users\dilip\code-to-escape\node_modules\.pnpm\vite@6.4.3_@types+node@22.20.1_jiti@1.21.7_tsx@4.23.1_yaml@2.9.0\node_modules
set NODE_PATH=%VITE_PATH%\vite\bin\node_modules;%VITE_PATH%\vite\node_modules;%VITE_PATH%;C:\Users\dilip\code-to-escape\node_modules\.pnpm\node_modules
cd /d C:\Users\dilip\code-to-escape\apps\game-client
node %VITE_PATH%\vite\bin\vite.js >> C:\Users\dilip\code-to-escape\logs\game-client.out.log 2>&1
