@echo off
echo ====================================================
echo Starting HealthGuard React Frontend on Port 5173...
echo ====================================================
corepack pnpm --filter @workspace/healthguard run dev
pause
