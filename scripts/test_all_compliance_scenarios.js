/**
 * 화학물질관리법 15대 핵심 실무 컴플라이언스 시나리오 종합 검증 테스트 스위트
 */
const http = require('http');

const scenarios = [
  {
    name: "1. 수입 확인명세서 1건 누락",
    query: "수입제품 확인명세서 1건 제출을 누락했는데 처벌기준 알려줘",
    expectedStatute: "제9조",
    expectedFine: "600만원"
  },
  {
    name: "2. 사고대비물질 잠금장치 미설치",
    query: "사고대비물질 보관장소 잠금장치 안했을때 처벌조항 알려줘",
    expectedStatute: "제40조",
    expectedFine: "3년 이하"
  },
  {
    name: "3. 관리대장 작성 누락",
    query: "사고대비물질 관리대장 작성 누락 시 처벌기준 알려줘",
    expectedStatute: "제50조",
    expectedFine: "180만원"
  },
  {
    name: "4. 유해화학물질관리자 선임 미신고",
    query: "유해화학물질 관리자 선임하고 신고를 안했어. 과태료 얼마야?",
    expectedStatute: "제32조",
    expectedFine: "120만원"
  },
  {
    name: "5. 취급시설 정기검사 기준 및 미수검 처벌",
    query: "유해화학물질 정기검사 안받고 공장 돌리면 처벌이 어떻게 돼?",
    expectedStatute: "제33조",
    expectedFine: "3년 이하"
  },
  {
    name: "6. 수산화나트륨 10톤 탱크 정기검사 주기",
    query: "수산화나트륨 50% 10톤 저장탱크 정기검사 주기 알려줘",
    expectedStatute: "2년 주기",
    expectedFine: "20톤"
  },
  {
    name: "7. 종사자 안전교육 미실시",
    query: "유해화학물질 종사자 안전교육 안 시키면 과태료 얼마야?",
    expectedStatute: "제33조",
    expectedFine: "100만원"
  },
  {
    name: "8. 비상세안설비 설치 기준",
    query: "비상세안설비 수온이랑 설치거리 기준 알려줘",
    expectedStatute: "10초",
    expectedFine: "15"
  },
  {
    name: "9. 소량 취급시설 방류벽 완화",
    query: "소량 취급시설은 방류벽 면제받을 수 있어?",
    expectedStatute: "트레이",
    expectedFine: "면제"
  },
  {
    name: "10. 유해화학물질 도급신고 미이행",
    query: "유해화학물질 취급 도급주고 신고 안했어. 과태료 얼마야?",
    expectedStatute: "제31조",
    expectedFine: "300만원"
  }
];

function runTest(scenario) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ query: scenario.query, forceFresh: true });
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/consult',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const answer = data.answer || '';
            const passStatute = answer.includes(scenario.expectedStatute);
            const passFine = answer.includes(scenario.expectedFine);
            const passed = passStatute && passFine;

            resolve({
              name: scenario.name,
              query: scenario.query,
              passed,
              passStatute,
              passFine,
              snippet: answer.substring(0, 150).replace(/\n/g, ' ')
            });
          } catch (e) {
            resolve({ name: scenario.name, passed: false, error: e.message });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ name: scenario.name, passed: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 화관법 10대 실무 컴플라이언스 시나리오 정밀 검증');
  console.log('====================================================\n');

  let passedCount = 0;

  for (const s of scenarios) {
    const res = await runTest(s);
    if (res.passed) {
      passedCount++;
      console.log(`✅ [PASS] ${res.name}`);
      console.log(`   요약: ${res.snippet}...`);
    } else {
      console.log(`❌ [FAIL] ${res.name}`);
      console.log(`   근거조항 검증: ${res.passStatute ? 'OK' : 'FAIL'} / 금액·처분 검증: ${res.passFine ? 'OK' : 'FAIL'}`);
      console.log(`   응답 일부: ${res.snippet}`);
    }
    console.log('----------------------------------------------------');
  }

  console.log(`\n🎉 전체 테스트 결과: ${passedCount} / ${scenarios.length} 성공 (${Math.round((passedCount/scenarios.length)*100)}%)`);
}

runAllTests();
