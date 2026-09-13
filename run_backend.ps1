Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Starting HealthGuard FastAPI Backend on Port 8000..." -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

$VenvPython = ".\venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
    & $VenvPython -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
} else {
    python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
}
