/**
 * 일반 화학물질 제조업/수입/보관/사용 복합 사업장 20대 실무 난제 시뮬레이션
 */
const http = require('http');

const plantQueries = [
  { id: 1, title: "혼합물 제조 시 규정수량 기준 영업구분", query: "새로운 혼합물 제품을 제조하려는데 인체급성유해성물질 3%가 함유되어 있어. 화관법상 제조허가 대상이야 아니면 신고 대상이야?" },
  { id: 2, title: "CBI 비공개 원료 수입 시 확인명세서", query: "해외 본사에서 원료 수입하는데 전성분 중 1개가 영업비밀 CBI라서 CAS 번호를 안 알려줘. 확인명세서 어떻게 내야 해?" },
  { id: 3, title: "복수 옥외저장탱크 방류벽 용량 계산", query: "실외에 옥외저장탱크 3기(30톤 1기, 20톤 2기)가 같은 방류벽 안에 있어. 방류벽 유효용량은 얼마 이상이어야 해?" },
  { id: 4, title: "이송배관 신설 시 비파괴검사(RT) 비율", query: "공장 내 유해화학물질 이송배관 신설했는데 비파괴검사 RT는 전체 배관 연결부의 몇 %를 해야 해?" },
  { id: 5, title: "가스누출감지기 설치 거리 및 높이", query: "실내 유해화학물질 제조설비와 펌프 주변에 가스누출감지기를 설치해야 하는데 몇 미터 간격으로 설치해야 해?" },
  { id: 6, title: "취급시설 정기검사 부적합 시 조치", query: "취급시설 정기검사 받았는데 부적합 불합격 판정받았어. 며칠 이내에 재검사 받아야 해? 안 받으면 처벌은?" },
  { id: 7, title: "취급량 2천톤 기술인력 및 관리자 수", query: "우리 공장이 연간 유해화학물질을 2,000톤 취급하는데 기술인력 및 유해화학물질관리자를 몇 명 선임해야 해?" },
  { id: 8, title: "생산직 신규입사자 법정 안전교육 시간", query: "현장 생산직 신규 입사자가 유해화학물질을 직접 다루는데 작업 투입 전에 교육 몇 시간 시켜야 해?" },
  { id: 9, title: "정기보수(셧다운) 탱크세척 도급 절차", query: "공장 셧다운 정기보수 때 외부 협력업체에 탱크 세척 작업을 도급주려고 해. 도급 시 사전신고 절차와 과태료 알려줘" },
  { id: 10, title: "주 1회 취급시설 자체점검 필수항목", query: "매주 1회 취급시설 자체점검할 때 점검표에 반드시 포함되어야 할 필수 항목과 대장 보존기간 알려줘" },
  { id: 11, title: "산/알칼리/인화성 유해화학물질 혼적금지", query: "보관창고에서 황산(산성)이랑 가성소다(알칼리성), 톨루엔(인화성 액체)을 같은 칸에 같이 보관해도 돼?" },
  { id: 12, title: "1톤 트럭 질산 500kg 이송 시 운반기준", query: "공장 간 1톤 트럭으로 질산 500kg을 이송하려는데 운반계획서 제출해야 해? 운반자격증은 필요한가?" },
  { id: 13, title: "취급량 30% 증가 시 예방관리계획서 변경", query: "화학사고예방관리계획서 적합 받았는데 유해화학물질 취급량이 30% 증가했어. 계획서 다시 제출해야 해?" },
  { id: 14, title: "실내 보관창고 환기 및 배풍설비 기준", query: "실내 보관창고에 환기설비를 설치해야 하는데 바닥에서 배기구 높이와 환기 기준 알려줘" },
  { id: 15, title: "잔여 폐액 위탁폐기 시 화관법 의무", query: "사용하고 남은 잔여 유해화학물질 폐액을 폐기물업체에 위탁할 때 화관법상 실적보고나 관리대장 기록해야 해?" },
  { id: 16, title: "QC 분석실험실 시약 정기검사 면제", query: "품질관리 QC 실험실에서 분석용으로 인체급성유해성물질 시약 500ml를 보관·사용하는데 정기검사나 관리자 선임 면제돼?" },
  { id: 17, title: "원료 물질 변경 시 변경허가 vs 변경신고", query: "제조공정에서 사용하는 유해화학물질 종류를 변경(A물질에서 B물질로)하려고 해. 이건 변경허가야 변경신고야?" },
  { id: 18, title: "사고대비물질 CCTV 설치 및 영상보존", query: "사고대비물질 옥외 저장시설에 CCTV 영상정보처리기기 설치가 의무야? 녹화영상은 며칠간 보관해야 해?" },
  { id: 19, title: "인화성 유해화학물질 접지저항 기준", query: "톨루엔 같은 인화성 유해화학물질을 펌프로 이송할 때 접지선 연결 및 접지저항 기준이 어떻게 돼?" },
  { id: 20, title: "제조설비 긴급차단밸브 설치 조건", query: "유해화학물질 반응기나 제조설비에 긴급차단밸브를 반드시 설치해야 하는 기준 알려줘" }
];

function consult(query) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ query, forceFresh: true });
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
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ error: e.message, raw: body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ error: err.message }));
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  console.log("=========================================================================");
  console.log("🏭 화학물질 제조업/수입/보관/사용 복합 사업장 20대 실무 질문 테스트");
  console.log("=========================================================================\n");

  const results = [];

  for (const item of plantQueries) {
    const res = await consult(item.query);
    const answer = res.answer || '';
    
    // Check specific critical criteria
    const isGenericFallback = answer.includes("일치하는 직접 조항을 찾기 위해") || answer.includes("보다 구체적인 화학물질명이나");
    const hasArticleOrGuideline = /제\d+조|고시|지침|기준|별표/.test(answer);
    const hasClearNumbers = /\d+[%톤kg일년개시간℃m회cmL분초]|면제|허가|신고/.test(answer);
    
    let status = "PASS";
    let defectNotes = [];

    if (isGenericFallback) {
      status = "FAIL";
      defectNotes.push("🚨 일반 법조문 목록으로 폴백 (명확한 수치/규정 미응답)");
    }
    if (!hasArticleOrGuideline) {
      status = "FAIL";
      defectNotes.push("🚨 법령/고시/지침 근거 누락");
    }
    if (!hasClearNumbers) {
      status = "FAIL";
      defectNotes.push("🚨 구체적 정량 수치(기준값/기한/비율) 누락");
    }

    results.push({
      id: item.id,
      title: item.title,
      query: item.query,
      status,
      defectNotes,
      answer
    });

    console.log(`[Q${item.id}] ${status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${item.title}`);
    console.log(`   질문: "${item.query}"`);
    if (status === 'FAIL') {
      console.log(`   결함: ${defectNotes.join(' | ')}`);
      console.log(`   응답일부: ${answer.substring(0, 150).replace(/\n/g, ' ')}...`);
    } else {
      console.log(`   핵심요약: ${answer.substring(0, 110).replace(/\n/g, ' ')}...`);
    }
    console.log("-------------------------------------------------------------------------");
  }

  const fails = results.filter(r => r.status === 'FAIL');
  console.log(`\n📊 제조업 복합현장 테스트 결과: 전체 20건 중 성공 ${results.length - fails.length}건 / 결함 발견 ${fails.length}건`);
  console.log(`❌ 결함 발견 항목: ${fails.map(f => `Q${f.id}(${f.title})`).join(', ')}`);
}

runTest();
