@echo off
set NODE_PATH=C:\Users\dilip\code-to-escape\node_modules\.pnpm\tsx@4.23.1\node_modules\tsx\dist\node_modules;C:\Users\dilip\code-to-escape\node_modules\.pnpm\tsx@4.23.1\node_modules\tsx\node_modules;C:\Users\dilip\code-to-escape\node_modules\.pnpm\tsx@4.23.1\node_modules;C:\Users\dilip\code-to-escape\node_modules\.pnpm\node_modules
cd /d C:\Users\dilip\code-to-escape\apps\server
start "cte-worker" /min cmd /c node C:\Users\dilip\code-to-escape\node_modules\.pnpm\tsx@4.23.1\node_modules\tsx\dist\cli.mjs src/worker.ts >> C:\Users\dilip\code-to-escape\logs\worker.out.log 2>&1
