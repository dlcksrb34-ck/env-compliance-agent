const { OpenAI } = require('openai');
const legalEngine = require('./legal_engine');

/**
 * Perform RAG by retrieving relevant local statutes and asking OpenAI LLM to synthesize legal advice.
 * Supports both CCA (화관법) and K-REACH (화평법) seamlessly.
 */
async function consultWithLLM({ query, apiKey, model = 'gpt-5.5', law = 'cca' }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OpenAI API 키가 필요합니다.');
  }

  const selectedModel = (model || 'gpt-5.5').trim();
  const isKReach = law === 'kreach' || query.includes('화평법') || query.includes('등록 유예') || query.includes('신규화학물질') || query.includes('국외대리인') || query.includes('면제확인');

  let groundingDocs = [];
  let rawConsult;

  if (isKReach) {
    // 🧪 K-REACH Grounding Context
    rawConsult = legalEngine.consultKReachLegalAgent(query);
    groundingDocs.push(`[화학물질의 등록 및 평가 등에 관한 법률 (화평법 / K-REACH) 핵심 기준]
- 1톤 이상 기존화학물질 톤수별 등록 유예기간:
  * 1,000t 이상 및 중점관리물질(1t 이상): 2021년 12월 31일 종료
  * 100t ~ 1,000t: 2024년 12월 31일 종료
  * 10t ~ 100t: 2027년 12월 31일까지
  * 1t ~ 10t: 2030년 12월 31일까지
- 신규화학물질 (2025년 최신 개정): 연간 1톤 이상은 제조·수입 전 [본등록], 연간 1톤 미만은 [간이신고] (종전 100kg에서 1톤으로 대폭 완화)
- 등록면제: R&D(연구개발), 시약, 전량수출용 등은 사전 [등록면제확인] 필수 (KCMA)
- 국외대리인(OR, 제38조): 해외제조사가 OR 선임 시 환경부 신고 및 국내 수입자 서면 통보 필수
- 정보제공(제29조): 양도 시 등록번호/유해성 서면 제공 (위반 시 과태료 1차 600만 / 2차 800만 / 3차 1000만)
- 실적보존(제43조): 5년간 기록·보존 (위반 시 과태료 1차 180만 / 2차 240만 / 3차 300만)
- 무등록 제조·수입 벌칙: 5년 이하 징역 또는 1억원 이하 벌금 (매출액 5% 이하 과징금 병과)`);

    if (rawConsult.matrix_item) {
      const m = rawConsult.matrix_item;
      groundingDocs.push(`[화평법 위반 사안 매트릭스 참조 데이터]
- 사안명: ${m.title}
- 근거 법률 조항: ${m.statute_basis}
- 형사 벌칙: ${m.criminal_penalty}
- 과태료: ${m.administrative_fine ? `${m.administrative_fine.statute} (1차: ${m.administrative_fine.first_offense_str})` : '해당 없음'}
- 행정처분: ${m.administrative_disposition ? m.administrative_disposition.first_offense : '해당 없음'}`);
    }

  } else {
    // 🟢 CCA (화관법) Grounding Context
    rawConsult = legalEngine.consultLegalAgent(query);
    const matchedSubstance = legalEngine.findSubstanceFromQuery(query);

    groundingDocs.push(`[2025년 최신 개정 화학물질관리법 핵심 기준]
- 시행일: 법률 2025년 8월 7일 / 하위법령(시행규칙·고시) 2025년 10월 1일 전면 시행
- 물질 분류 개편: [인체급성 / 인체만성 / 생태유해성물질] 3대 세분화.
- 위험 비례형 영업 관리: [영업허가(하위수량 이상) / 영업신고(최하위~하위수량) / 영업면제(최하위 미만)] 3단계 차등관리.
- 검사주기: 영업허가(대량) 1년, 영업신고(중소량) 2년, 영업면제(소량) 3~4년.`);

    groundingDocs.push(`[화학물질안전원 취급시설 6대 핵심 기술지침]
1. 방류벽: 단일 탱크 용량의 110% 이상, 복수 탱크는 최대탱크의 110% 이상 체적 확보, 내약품성/불투수성 구조
2. 비상세안·샤워: 취급장소로부터 도보 10초(15m) 이내, 15분 이상 연속 급수, 공급수온 15~35℃(미온수 유지)
3. 가스누출감지기: 실내 주요 누출원 둘레 10~15m 간격, 증기 비중이 공기보다 무거우면 바닥 30cm 이내 하부 설치
4. 배관 비파괴검사(NDT): 유해화학물질 이송배관 맞대기 용접부 20% 이상 방사선투과시험(RT) 실시
5. 환기설비: 바닥 30cm 이내 하부 배기구, 실내 전체 시간당 12회 이상 강제 환기, KCs 방폭형 모터 사용
6. 혼적 금지: 산성-알칼리성-인화성 물질 간 1m 이상 이격거리 유지 또는 불연성 격벽 물리적 분리 보관`);

    if (matchedSubstance) {
      const sub = matchedSubstance;
      groundingDocs.push(`[질문 물질 규정수량 데이터 - ${sub.name_ko}]
- 물질명: ${sub.name_ko} [CAS No. ${sub.cas_no}]
- 유해성 분류: ${sub.hazard_category} (규제 함량: ${sub.regulation_cutoff_pct})
- 최하위 규정수량: 6톤 (영업신고 기준) / 하위 규정수량: ${sub.threshold_quantities.lower_tier_ton}톤 (영업허가 기준) / 상위 규정수량: ${sub.threshold_quantities.upper_tier_ton}톤`);
    }

    if (rawConsult.matrix_item) {
      const m = rawConsult.matrix_item;
      groundingDocs.push(`[화관법 위반 사안 매트릭스 참조 데이터]
- 사안명: ${m.title}
- 근거 법률 조항: ${m.statute_basis}
- 형사 벌칙: ${m.criminal_penalty}
- 과태료: ${m.administrative_fine ? `${m.administrative_fine.statute} (1차: ${m.administrative_fine.first_offense_str})` : '해당 없음'}`);
    }
  }

  const groundingContext = groundingDocs.join('\n\n====================\n\n');

  // 2. Initialize OpenAI Client
  const openai = new OpenAI({ apiKey: apiKey.trim() });

  // 3. System Prompt: Dynamic Intent Adaptation
  const systemPrompt = `당신은 대한민국 환경규제(${isKReach ? '화학물질등록평가법(화평법/K-REACH)' : '화학물질관리법(화관법)'}) 전문 수석 엔지니어이자 법률 자문 AI입니다.

[★ 질문 의도 기반의 맞춤형 답변 원칙 ★]

1. [유형 A: 절차 / 등록 / 면제 / 시설 기술기준 / 설계 문의인 경우]
   - 질문자가 신규 등록, 유예기간, 면제확인, 또는 시설 설계를 문의할 때는 **묻지도 않은 처벌이나 과태료, 감경 사족을 서두에 장황하게 늘어놓지 마세요!**
   - 질문에 필요한 **【1. 핵심 법정 기준 및 절차 직답】 ➡️ 【2. 법적 근거 및 제출 서류】 ➡️ 【3. 실무 이행 엔지니어링/행정 체크리스트】**로 명쾌하게 직답하세요.

2. [유형 B: 위반 / 처벌 / 과태료 / 누락 / 미이행 문의인 경우]
   - 사용자가 명확히 "처벌", "과태료", "누락했어", "안했을때"를 질문한 경우에만 처벌 중심 포맷을 적용하세요:
     ### 📌 1. 핵심 처벌 수위 직답 (형사벌칙 / 행정처분 / 과태료 차수별)
     ### ⚖️ 2. 법적 근거 조항
     ### 🛡️ 3. 실무 소명 및 50% 과태료 감경 가이드

3. [되묻기 절대 금지 & 1회 완결]
   - "조회해 드릴까요?" 등 불필요한 핑퐁을 유발하지 말고, 질문에 필요한 수치와 조항을 1번에 100% 완결하여 제시하세요.

[★ 2025년 개정 환경법령 최신 법정 용어 가드레일 (엄격 준수) ★]
- 종전의 획일적 명칭이었던 '유독물질'이라는 용어는 2025년 전면 개정 화관법 및 화평법에 따라 폐지·개편되었습니다.
- 답변 생성 시 구 명칭인 **'유독물질'이라는 표현을 단독으로 사용하지 마십시오.**
- 반드시 물질의 유해성 특성에 맞추어 **[인체급성유해성물질 / 인체만성유해성물질 / 생태유해성물질]** (또는 이를 포괄하는 **[인체등유해성물질]** / **[유해화학물질]**)로 정확하게 명시하십시오.`;

  const userPrompt = `[사용자 질문]
${query}

[로컬 ${isKReach ? '화평법(K-REACH)' : '화관법'} 지식베이스 검색 결과]
${groundingContext}`;

  const isReasoningOrNextGen = selectedModel.startsWith('o1') || selectedModel.startsWith('o3') || selectedModel.startsWith('gpt-5');

  const requestPayload = {
    model: selectedModel,
    messages: [
      { role: isReasoningOrNextGen ? 'user' : 'system', content: isReasoningOrNextGen ? `${systemPrompt}\n\n${userPrompt}` : systemPrompt },
      ...(isReasoningOrNextGen ? [] : [{ role: 'user', content: userPrompt }])
    ]
  };

  if (!isReasoningOrNextGen && (selectedModel.startsWith('gpt-4') || selectedModel.startsWith('gpt-3.5'))) {
    requestPayload.temperature = 0.2;
  }

  // 4. Request OpenAI Completion
  const response = await openai.chat.completions.create(requestPayload);

  const answer = response.choices[0].message.content;
  const usage = response.usage || {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  };

  const smartRouter = require('./smart_router');
  const costCalc = smartRouter.calculateTokenCost(selectedModel, usage.prompt_tokens, usage.completion_tokens);
  smartRouter.recordLLMUsage(selectedModel, usage.prompt_tokens, usage.completion_tokens);

  return {
    query,
    match_type: isKReach ? 'kreach_openai_rag' : 'cca_openai_rag',
    model_used: selectedModel,
    law_applied: isKReach ? 'kreach' : 'cca',
    title: rawConsult.title || (isKReach ? '화평법 AI 지능형 법률 분석' : '화관법 AI 지능형 법률 분석'),
    answer: answer,
    token_usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      cost_krw_str: `약 ${costCalc.costKRWFormatted}`,
      cost_usd: costCalc.costUSD
    },
    related_articles: rawConsult.related_articles || (isKReach ? ['화평법 제10조'] : ['화학물질관리법 제33조']),
    matrix_item: rawConsult.matrix_item,
    suggested_actions: rawConsult.suggested_actions || []
  };
}

module.exports = {
  consultWithLLM
};
