Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting HealthGuard React Frontend on Port 5173..." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

corepack pnpm --filter @workspace/healthguard run dev
