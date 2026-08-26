/**
 * 화관법 심층 결함 탐색기: 고난도 20대 복합 규제/기술기준 엣지케이스 테스트
 */
const http = require('http');

const edgeQueries = [
  { id: 1, title: "소방청 위험물법 vs 화관법 방류벽 이중검사", query: "위험물안전관리법상 제4류 제1석유류 옥외탱크 방류벽과 화관법상 방류벽이 동시에 적용될 때 검사는 소방서랑 환경공단 중 어디서 받아야 해?" },
  { id: 2, title: "법인 대표이사 형사처벌 시 영업허가 결격사유", query: "법인 대표이사가 다른 범죄로 징역 집행유예를 받았는데 화관법상 유해화학물질 영업허가 결격사유(제30조)에 해당해?" },
  { id: 3, title: "완충저류시설(사고유출수 집수) 설치 기준", query: "산업단지 밖 개별공장에서 유해화학물질을 다루는데 공장 부지 내에 완충저류시설 설치 기준과 용량 산정법이 뭐야?" },
  { id: 4, title: "보세구역 내 30일 장치 시 영업허가 여부", query: "인천항 보세창고에 수입 유해화학물질을 30일간 장치해 두었는데 보세구역 보관도 화관법상 영업허가나 보관시설 검사를 받아야 해?" },
  { id: 5, title: "사용 완료 빈 드럼통 매각/재사용 기준", query: "사용한 유해화학물질 200L 드럼통 세척해서 고물상에 매각하거나 재사용할 때 화관법 위반이야?" },
  { id: 6, title: "외부 공공도로 횡단 이송배관 이중관 의무", query: "공장 밖 공공도로 상공이나 지하로 유해화학물질 이송배관을 가설할 때 이중관 설치가 법적 의무야?" },
  { id: 7, title: "구매자 안전정보 서면고지 5대 필수항목", query: "유해화학물질을 구매자에게 납품할 때 법 제29조의2에 따라 서면으로 알려주어야 하는 필수 5가지 항목이 뭐야?" },
  { id: 8, title: "방류벽 내부 바닥 드레인 밸브 설치 가능 여부", query: "옥외저장탱크 방류벽 내부 바닥에 우수 배출용 수동 드레인 밸브를 설치하는 것이 화관법상 허용돼?" },
  { id: 9, title: "복수 사고대비물질 혼합물 R-Index 합산식", query: "질산 30% 수용액과 황산 40% 수용액을 같이 보관할 때 사고대비물질 규정수량 합산 비율(R값) 계산 공식 알려줘" },
  { id: 10, title: "취급설비 지지대 기둥/보 내화구조 기준", query: "유해화학물질 취급설비의 지지대와 배관 지지물은 몇 시간 이상의 내화구조로 시공해야 해?" },
  { id: 11, title: "인근 2개 공장 관리자 공동안전관리 선임", query: "같은 산업단지 내에 있는 중소기업 2개 공장이 1명의 유해화학물질관리자를 공동으로 선임할 수 있어?" },
  { id: 12, title: "유해화학물질 소분 용기 UN인증 마크 의무", query: "유해화학물질을 소분해서 플라스틱 말통에 담아 유통할 때 UN 인증 마크가 없는 일반 용기를 쓰면 처벌받아?" },
  { id: 13, title: "배관 경로 30m 연장 시 변경검사 수검 시기", query: "기존 유해화학물질 저장탱크의 배관을 30m 연장하고 펌프 용량을 늘렸을 때 가동 전 설치검사를 다시 받아야 해?" },
  { id: 14, title: "사고대비물질 도난/분실 시 즉시 신고 시한", query: "사고대비물질 시약병 1병이 도난당한 걸 발견했어. 며칠 몇 시간 이내에 경찰서나 환경청에 신고해야 해? 미신고 시 처벌은?" },
  { id: 15, title: "안전밸브(PSV) 독성가스 스크러버 연결 의무", query: "유해화학물질 반응기에 부착된 안전밸브에서 분출되는 가스를 대기로 직접 방출해도 돼? 스크러버 연결 기준은?" },
  { id: 16, title: "무역상사 오퍼상(수입대행) 영업허가 대상 여부", query: "물건을 국내 창고에 안 들이고 무역 중개만 하거나 서류만 대행하는 오퍼상도 화관법상 영업허가를 받아야 해?" },
  { id: 17, title: "영업정지 대체 과징금 부과 상한율(매출액 %)", query: "영업정지 1개월 처분을 과징금으로 대체할 때 화관법상 과징금은 매출액의 최대 몇 %까지 부과돼?" },
  { id: 18, title: "화학물질 확인명세서(KCMA) 유효기간", query: "한번 발급받은 화학물질 확인명세서 증명서는 유효기간이 몇 년이야? 성분 안 바뀌면 영구 사용 가능해?" },
  { id: 19, title: "방류벽 높이 및 간격 이격거리 기준", query: "옥외저장탱크 측판과 방류벽 사이의 이격거리는 탱크 높이의 몇 m 이상 떨어져야 해?" },
  { id: 20, title: "유해화학물질 시약 판매업 허가 면제 조건", query: "학교나 연구소에 실험용 시약만 전문으로 판매하는 시약판매업소는 영업허가를 받아야 해 아니면 면제야?" }
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

async function runHunter() {
  console.log("=========================================================================");
  console.log("🎯 화관법 고난도 20대 복합 규제·기술기준 결함 탐색 (Hunter Mode)");
  console.log("=========================================================================\n");

  const results = [];

  for (const item of edgeQueries) {
    const res = await consult(item.query);
    const answer = res.answer || '';
    
    // Strict evaluation rules
    const isGenericFallback = answer.includes("일치하는 직접 조항을 찾기 위해") || answer.includes("보다 구체적인 화학물질명이나") || answer.includes("기본 법조문을 안내합니다");
    const hasArticle = /제\d+조|고시|지침|기준|별표/.test(answer);
    
    let status = "PASS";
    let failureReasons = [];

    if (isGenericFallback) {
      status = "FAIL";
      failureReasons.push("❌ 일반 법조문 목록 폴백 (구체적 직답 실패)");
    }
    if (!hasArticle) {
      status = "FAIL";
      failureReasons.push("❌ 법령/고시/조문 근거 누락");
    }

    results.push({
      id: item.id,
      title: item.title,
      query: item.query,
      status,
      failureReasons,
      answer
    });

    console.log(`[Q${item.id}] ${status === 'PASS' ? '✅ PASS' : '❌ FAIL'} | ${item.title}`);
    console.log(`   질문: "${item.query}"`);
    if (status === 'FAIL') {
      console.log(`   🚨 실패 사유: ${failureReasons.join(', ')}`);
      console.log(`   📄 응답: ${answer.substring(0, 160).replace(/\n/g, ' ')}...`);
    } else {
      console.log(`   📄 응답요약: ${answer.substring(0, 120).replace(/\n/g, ' ')}...`);
    }
    console.log("-------------------------------------------------------------------------");
  }

  const fails = results.filter(r => r.status === 'FAIL');
  console.log(`\n📊 헌터 모드 테스트 결과: 전체 20건 중 통과 ${results.length - fails.length}건 / 💥 실패(결함 발견) ${fails.length}건`);
  console.log(`💥 실패(결함) 질문 리스트:`);
  fails.forEach(f => {
    console.log(`   - [Q${f.id}] ${f.title}: "${f.query}"`);
  });
}

runHunter();
