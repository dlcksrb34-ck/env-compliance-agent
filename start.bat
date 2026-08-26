@echo off
chcp 65001 > nul
echo ========================================================
echo   🌿 화관법 컴플라이언스 AI 에이전트 시작 중...
echo ========================================================
echo.

:: 1. Node.js 설치 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 Node.js LTS 버전을 설치해 주세요.
    pause
    exit /b
)

:: 2. 의존성 패키지 확인 및 설치
if not exist node_modules (
    echo [알림] 필수 패키지 설치 중입니다 (최초 1회 실행)...
    call npm install
)

:: 3. 서버 실행 및 브라우저 열기
echo [알림] 서버 구동 중... (http://localhost:3000)
start "" "http://localhost:3000"
node server/api.js
pause
