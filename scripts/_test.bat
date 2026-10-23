@echo off
cd /d C:\Users\dilip\code-to-escape
pnpm --filter @code-to-escape/server test > C:\Users\dilip\AppData\Local\Temp\cte_test.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> C:\Users\dilip\AppData\Local\Temp\cte_test.log
