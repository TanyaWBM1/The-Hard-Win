@echo off
REM The Hard Win — daily comment intake launcher (run by Windows Task Scheduler).
REM DRAFT-ONLY: reads comments and stages AI-drafted replies as needs_review.
REM It NEVER posts and NEVER changes an approved reply. Public replying stays manual
REM (reply-worker.js with REPLIES_LIVE=1 --confirm).
cd /d "C:\Users\Billionaire Mind DT\ig-daily-cards"
echo ---------- Run at %DATE% %TIME% ---------- >> "comment-intake-log.txt"
set COMMENTS_LIVE=1
"C:\Program Files\nodejs\node.exe" comment-intake.js >> "comment-intake-log.txt" 2>&1
