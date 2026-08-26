/**
 * 화관법 심층 스트레스 테스트: 20가지 다양한 실무 난제 질의 및 오류 탐색기
 */
const http = require('http');

const stressQueries = [
  { id: 1, query: "황산 98% 5톤 탱크로리로 운반할 때 운반계획서 제출 기준이랑 안 냈을 때 처벌 알려줘" },
  { id: 2, query: "유해화학물질 기술인력 퇴사했는데 며칠 이내에 다시 채용해야 해? 안 채용하면 처벌은?" },
  { id: 3, query: "화학물질 배출량조사 대상인데 기한 지나서 제출 안 했어. 과태료 얼마야?" },
  { id: 4, query: "MSDS 경고표지 훼손돼서 지워졌는데 이것도 화관법 위반으로 처벌받아?" },
  { id: 5, query: "톨루엔 20톤 저장탱크 방류벽 유효용량 계산식 알려줘" },
  { id: 6, query: "화학사고예방관리계획서 주민고지 안 했을 때 처벌조항 알려줘" },
  { id: 7, query: "유해화학물질 영업 변경허가 안 받고 저장탱크 증설해서 가동했어. 처벌 어떻게 돼?" },
  { id: 8, query: "연구소에서 시험용 시약 소량 수입하는데 화학물질 확인명세서 면제돼?" },
  { id: 9, query: "사업장 상호(회사명)랑 대표자가 변경됐는데 며칠 이내에 변경신고 해야 해? 미신고 시 과태료는?" },
  { id: 10, query: "유해화학물질 취급시설 주 1회 자체점검을 안 하고 한 달에 한 번만 했어. 처벌기준은?" },
  { id: 11, query: "취급 근로자한테 방독마스크랑 화학보호복 개인보호장구 안 줬을 때 처벌조항 알려줘" },
  { id: 12, query: "화학사고 발생했는데 15분 이내에 119나 환경청에 즉시 신고 안 했어. 처벌 어떻게 돼?" },
  { id: 13, query: "유해화학물질 운반차량 설치검사 안 받고 운행했을 때 처벌" },
  { id: 14, query: "수산화나트륨 30%짜리 500kg 드럼 보관할 때 방류벽 꼭 설치해야 해?" },
  { id: 15, query: "배출저감계획서 제출 대상인데 안 냈을 때 과태료 얼마야?" },
  { id: 16, query: "유해화학물질 판매업 허가나 신고 없이 다른 공장에 팔았어. 처벌 수위는?" },
  { id: 17, query: "화학물질 통계조사 2년마다 하는 거 제출 안 했을 때 과태료 얼마야?" },
  { id: 18, query: "국외제조자가 선임한 국내대리인(OR)이 수입자한테 통보 안 했을 때 처벌" },
  { id: 19, query: "제한물질 수입허가 안 받고 수입했을 때 처벌조항 알려줘" },
  { id: 20, query: "폐업신고 안 하고 공장 문 닫았을 때 과태료 얼마야?" }
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

async function runStressTest() {
  console.log("===============================================================");
  console.log("🔥 20대 실무 난제 심층 스트레스 테스트 및 결함 탐색 시작");
  console.log("===============================================================\n");

  const results = [];

  for (const item of stressQueries) {
    const res = await consult(item.query);
    const answer = res.answer || '';
    const title = res.title || '';
    
    // Check quality indicators
    const hasArticle = /제\d+조/.test(answer);
    const hasFineOrPenalty = /만원|징역|벌금|경고|개선명령|과태료/.test(answer);
    const isGenericFallback = answer.includes("일치하는 직접 조항을 찾기 위해") || answer.includes("보다 구체적인 화학물질명이나");
    const hasUnansweredQuestion = answer.includes("조회해 드릴까요?") || answer.includes("알려드릴까요?");

    let status = "PASS";
    let issueReason = [];

    if (isGenericFallback) {
      status = "FAIL";
      issueReason.push("❌ 구체적 직답 실패 (일반 법령 목록으로 일반 폴백됨)");
    }
    if (!hasArticle) {
      status = "FAIL";
      issueReason.push("❌ 근거 법조문(제O조) 누락");
    }
    if (!hasFineOrPenalty) {
      status = "FAIL";
      issueReason.push("❌ 처벌/과태료/처분 수치 누락");
    }
    if (hasUnansweredQuestion) {
      status = "FAIL";
      issueReason.push("❌ 사용자에게 되묻기 발생");
    }

    results.push({
      id: item.id,
      query: item.query,
      status,
      issueReason,
      title,
      answerSnippet: answer.substring(0, 180).replace(/\n/g, ' ')
    });

    console.log(`[Q${item.id}] ${status === 'PASS' ? '✅' : '❌'} "${item.query}"`);
    if (status === 'FAIL') {
      console.log(`   🚨 결함 사유: ${issueReason.join(', ')}`);
      console.log(`   📄 응답 요약: ${answer.substring(0, 120).replace(/\n/g, ' ')}...`);
    } else {
      console.log(`   📄 응답 요약: ${answer.substring(0, 100).replace(/\n/g, ' ')}...`);
    }
    console.log('---------------------------------------------------------------');
  }

  const fails = results.filter(r => r.status === 'FAIL');
  console.log(`\n📊 스트레스 테스트 결과: 전체 ${results.length}건 중 성공 ${results.length - fails.length}건 / 실패(결함 발견) ${fails.length}건`);
  console.log(`❌ 결함 발견 항목 ID: ${fails.map(f => `Q${f.id}`).join(', ')}`);
}

runStressTest();
