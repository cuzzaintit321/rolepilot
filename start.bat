@echo off
cd /d "%~dp0"
if not exist dist\index.html (
  echo Build the app first: npm ci ^&^& npm run build
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173 and keep this window open.
echo Press Ctrl+C to stop.
python -m http.server 4173 --bind 127.0.0.1 --directory dist
pause
