/**
 * 화학물질등록평가법 (화평법 / K-REACH) 10대 핵심 실무 컴플라이언스 테스트 스위트
 */

const http = require('http');

const kreachScenarios = [
  {
    id: 1,
    title: "100톤 이상 기존화학물질 등록 유예기간",
    query: "연간 100톤 이상 1,000톤 미만 기존화학물질을 수입하려는데 등록 유예기간이 언제까지야?",
    expectedKeywords: ["2024년 12월 31일", "유예기간", "화평법 제14조"]
  },
  {
    id: 2,
    title: "1톤 이상 10톤 미만 기존화학물질 등록 유예기간",
    query: "연간 5톤 수입하는 기존화학물질 등록 유예기간은 몇 년도까지야?",
    expectedKeywords: ["2030년 12월 31일", "화평법 제14조"]
  },
  {
    id: 3,
    title: "무등록 기존화학물질 수입 시 형사벌칙 및 과징금",
    query: "1톤 이상 기존화학물질을 등록 안 하고 수입했을 때 처벌 조항과 과징금 기준 알려줘",
    expectedKeywords: ["5년 이하의 징역", "1억원 이하의 벌금", "매출액의", "5%", "화평법 제49조"]
  },
  {
    id: 4,
    title: "신규화학물질 100kg 이상 등록 vs 100kg 미만 신고",
    query: "신규화학물질을 수입하려는데 100kg 이상 등록과 100kg 미만 신고의 차이점 알려줘",
    expectedKeywords: ["100kg", "본등록", "신고", "국립환경과학원", "제10조"]
  },
  {
    id: 5,
    title: "연구개발(R&D) 시약 등록면제확인 절차",
    query: "연구소에서 시험연구용 R&D 시약을 수입할 때 등록면제확인 신청 절차와 면제 기준 알려줘",
    expectedKeywords: ["등록면제확인", "제11조", "한국화학물질관리협회", "R&D"]
  },
  {
    id: 6,
    title: "해외 본사 CBI 국외대리인(OR) 선임 및 과태료",
    query: "해외 제조사가 영업비밀로 성분 안 알려줘서 OR 선임하려는데 수입자 통보 안 하면 과태료 얼마야?",
    expectedKeywords: ["국외대리인", "OR", "제38조", "600만원", "800만원", "1,000만원", "별표 2"]
  },
  {
    id: 7,
    title: "화학물질 양도 시 정보제공(제29조) 위반 과태료",
    query: "화학물질을 거래처에 납품할 때 등록번호랑 안전정보 안 주면 과태료가 얼마야?",
    expectedKeywords: ["제29조", "과태료", "600만원", "800만원", "1,000만원", "별표 2"]
  },
  {
    id: 8,
    title: "화평법 실적 관리대장 5년 기록·보존(제43조) 위반 과태료",
    query: "화평법상 제조 수입 판매 실적 대장을 작성 안 했을 때 과태료 기준 알려줘",
    expectedKeywords: ["제43조", "5년간", "180만원", "240만원", "300만원"]
  },
  {
    id: 9,
    title: "제조수입량 증가 시 변경등록 기한",
    query: "등록한 화학물질의 수입량이 증가해서 톤수 범위가 바뀌었을 때 변경등록 기한과 벌칙은?",
    expectedKeywords: ["1개월", "변경등록", "3년 이하의 징역", "5천만원 이하의 벌금", "제12조"]
  },
  {
    id: 10,
    title: "공동등록 협의체(CICO) 대표등록자 및 LOA 사용권",
    query: "기존화학물질 공동등록할 때 협의체(CICO) 가입 절차와 시험자료 소유권(LOA) 비용 분담 기준 알려줘",
    expectedKeywords: ["공동등록", "CICO", "대표등록자", "LOA", "제15조"]
  }
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

async function runKReachTest() {
  console.log("=========================================================================");
  console.log("🧪 화학물질등록평가법 (화평법 / K-REACH) 10대 실무 컴플라이언스 테스트");
  console.log("=========================================================================\n");

  let passCount = 0;
  let failCount = 0;

  for (const s of kreachScenarios) {
    const res = await consultKReach(s.query);
    const answer = res.answer || '';
    
    // Check keyword matches
    const missing = s.expectedKeywords.filter(kw => !answer.includes(kw));
    const passed = missing.length === 0;

    if (passed) {
      passCount++;
      console.log(`[Q${s.id}] ✅ PASS | ${s.title}`);
    } else {
      failCount++;
      console.log(`[Q${s.id}] ❌ FAIL | ${s.title}`);
      console.log(`   질문: "${s.query}"`);
      console.log(`   누락 키워드: ${missing.join(', ')}`);
      console.log(`   응답 일부: ${answer.substring(0, 150).replace(/\n/g, ' ')}...`);
    }
    console.log("-------------------------------------------------------------------------");
  }

  console.log(`\n📊 화평법(K-REACH) 테스트 결과: 전체 10건 중 성공 ${passCount}건 / 실패 ${failCount}건`);
  if (failCount === 0) {
    console.log("🎉 화평법 10대 실무 컴플라이언스 테스트 전원 합격 (100% Pass)!");
  }
}

runKReachTest();
