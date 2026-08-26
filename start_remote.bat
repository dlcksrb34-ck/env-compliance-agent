@echo off
chcp 65001 > nul
echo ========================================================
echo   🌐 [원격 접속 모드] 환경법 AI 에이전트 외부 URL 생성기
echo ========================================================
echo.
echo [1/3] 필수 패키지 점검 중...
if not exist node_modules (
    call npm install
)

echo [2/3] 백엔드 로컬 서버 구동 중... (포트: 3000)
start /b node server/api.js

echo [3/3] 외부 전용 보안 URL(터널) 연결 중...
echo.
echo ========================================================
echo  📌 아래 출력되는 'your url is: https://...' 주소를 복사하여
echo     회사 PC나 스마트폰 브라우저에서 접속하시면 됩니다!
echo ========================================================
echo.
call npx --yes localtunnel --port 3000
pause
