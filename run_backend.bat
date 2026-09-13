@echo off
echo ====================================================
echo Starting HealthGuard FastAPI Backend on Port 8000...
echo ====================================================
if exist ".\venv\Scripts\activate.bat" (
    call .\venv\Scripts\activate.bat
)
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
