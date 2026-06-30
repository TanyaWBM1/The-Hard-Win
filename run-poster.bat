@echo off
REM The Hard Win — daily poster launcher (run by Windows Task Scheduler)
cd /d "C:\Users\Billionaire Mind DT\ig-daily-cards"
echo ---------- Run at %DATE% %TIME% ---------- >> "post-log.txt"
"C:\Program Files\nodejs\node.exe" post-daily.js >> "post-log.txt" 2>&1
