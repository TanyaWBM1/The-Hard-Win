@echo off
REM The Hard Win — weekly posts summary launcher (run by Windows Task Scheduler).
REM READ-ONLY: lists recent posts with like/comment counts so Tanya can see which posts
REM have comment activity. It does NOT post, does NOT read comment text, does NOT write to
REM Supabase, and does NOT change account data.
cd /d "C:\Users\Billionaire Mind DT\ig-daily-cards"
echo ========== START %DATE% %TIME% ========== >> "posts-summary-log.txt"
call npm run posts:summary >> "posts-summary-log.txt" 2>&1
echo ========== END   %DATE% %TIME% ========== >> "posts-summary-log.txt"
