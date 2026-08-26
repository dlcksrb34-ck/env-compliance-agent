/**
 * 화평법 화학물질/화장품/세제/계면활성제 원료 면제 판정 결함 탐색기 (5개 실패 찾을 때까지 테스트)
 */
const http = require('http');

const exemptionQueries = [
  { id: 1, title: "화장품 제조용 원료 화학물질 수입 시 화평법 면제 여부", query: "우리 회사는 화장품 제조사인데 화장품 원료로 쓸 계면활성제 5톤을 수입하려 해. 화장품법 적용받으니 화평법 등록 면제돼?" },
  { id: 2, title: "세탁세제 원료 음이온 계면활성제 수입 시 화평법 면제 여부", query: "세탁세제 제조용 음이온 계면활성제(LAS) 10톤을 수입하는데 안전확인대상생활화학제품 확인을 받았으면 화평법 등록 면제야?" },
  { id: 3, title: "고분자화합물(Polymer) Mn 12,000 저분자 1% 미만 면제 기준", query: "화장품 증점제로 쓰이는 고분자(Polymer)인데 수평균분자량(Mn)이 12,000이고 1,000 미만 저분자 함량이 1% 미만이야. 화평법 등록 면제돼?" },
  { id: 4, title: "고분자 내 신규 단량체(Monomer) 1.5% 결합 시 등록 면제", query: "기존 고분자인데 구성 단량체 중 신규화학물질 모노머가 1.5% 중량비로 결합되어 있어. 이 고분자 수입할 때 신규물질 등록해야 해?" },
  { id: 5, title: "천연 식물 추출물 및 호호바씨오일 비변형 천연물질 면제", query: "호호바씨오일이나 천연 식물 추출물을 화학적 변형 없이 단순 압착 추출해서 10톤 수입하는데 화평법 등록 대상이야?" },
  { id: 6, title: "반응기 내부 비분리 중간체(Non-isolated) 등록 면제", query: "계면활성제 합성 공정 중 반응기 안에서 다음 반응으로 바로 소모되는 비분리 중간체도 화평법 등록해야 해?" },
  { id: 7, title: "전량 국외 수출용 계면활성제 원료 수입 시 면제확인", query: "국내 공장에서 계면활성제로 가공한 뒤 전량 해외로 수출하는 원료 20톤을 수입할 때 화평법 등록 면제받으려면 어떻게 해야 해?" },
  { id: 8, title: "글리세린(CAS No. 56-81-5) 화평법 [별표 1] 면제 물질 여부", query: "화장품 보습제 원료인 글리세린(CAS 56-81-5)을 연간 50톤 수입하는데 화평법 등록해야 해 아니면 별표1 면제야?" },
  { id: 9, title: "수소첨가 변성 천연유지(경화유) 천연물질 면제 제외 여부", query: "천연 팜유를 수소첨가 반응(경화유)시킨 원료는 화학적 변형 물질이라 화평법 천연물질 면제가 안 돼?" },
  { id: 10, title: "공장 파일럿 300kg 시제품 생산용 R&D 면제 유효기간", query: "신제품 샴푸 개발을 위해 공장 파일럿 라인에서 300kg 테스트 제조용으로 수입할 때 R&D 면제확인 유효기간이 몇 년이야?" },
  { id: 11, title: "성형 완제품 플라스틱 용기 수입 시 화학물질 등록 여부", query: "세제 용기 플라스틱 캡 완제품(Article)을 수입할 때 플라스틱 내 첨가된 화학물질도 화평법 등록해야 해?" },
  { id: 12, title: "의약외품(손소독제) 원료 에탄올 수입 시 화평법 적용 여부", query: "손소독제(의약외품) 제조용 에탄올 원료를 수입할 때 약사법 적용으로 화평법 등록이 면제돼?" }
];

function consultKReach(query) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ query, law: 'kreach', forceFresh: true });
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
  console.log("🧪 화평법 화장품/세제/계면활성제 원료 면제 판정 결함 탐색 (5개 이상 실패 찾기)");
  console.log("=========================================================================\n");

  const results = [];

  for (const item of exemptionQueries) {
    const res = await consultKReach(item.query);
    const answer = res.answer || '';
    
    // Strict evaluation rules for specific exemptions
    const isGenericFallback = answer.includes("화평법 기본 규정 안내") || answer.includes("일치하는 직접 조항을 찾기 위해");
    const hasArticle = /제\d+조|별표|고시|시행령|시행규칙|면제/.test(answer);
    
    let status = "PASS";
    let failureReasons = [];

    if (isGenericFallback) {
      status = "FAIL";
      failureReasons.push("❌ 화평법 일반 개요 폴백 (구체적 원료 면제 여부 직답 실패)");
    }
    if (!hasArticle) {
      status = "FAIL";
      failureReasons.push("❌ 법령 근거 누락");
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
      console.log(`   📄 응답: ${answer.substring(0, 150).replace(/\n/g, ' ')}...`);
    } else {
      console.log(`   📄 응답: ${answer.substring(0, 120).replace(/\n/g, ' ')}...`);
    }
    console.log("-------------------------------------------------------------------------");
  }

  const fails = results.filter(r => r.status === 'FAIL');
  console.log(`\n📊 화평법 면제 탐색 결과: 전체 ${results.length}건 중 통과 ${results.length - fails.length}건 / 💥 실패(결함 적발) ${fails.length}건`);
  console.log(`💥 적발된 결함 질문 리스트:`);
  fails.forEach(f => {
    console.log(`   - [Q${f.id}] ${f.title}: "${f.query}"`);
  });
}

runHunter();
