@echo off
cd /d C:\Users\dilip\code-to-escape
docker image ls > logs\images.txt 2>&1
docker compose ps >> logs\images.txt 2>&1
echo ---DONE--- >> logs\images.txt
