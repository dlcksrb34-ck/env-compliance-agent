const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// Load databases
let actData, decreeData, ruleData, noticesData, penaltiesMatrix, qnaData, substancesData, masterMatrixData, techGuidelinesData, compNoticesData;

function loadDatabases() {
  actData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'act.json'), 'utf8'));
  decreeData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'decree.json'), 'utf8'));
  ruleData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rule.json'), 'utf8'));
  noticesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'notices.json'), 'utf8'));
  penaltiesMatrix = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'penalties_matrix.json'), 'utf8'));
  qnaData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'qna_database.json'), 'utf8'));
  substancesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'substances_thresholds.json'), 'utf8'));
  masterMatrixData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'substances_comprehensive_matrix.json'), 'utf8'));

  if (fs.existsSync(path.join(DATA_DIR, 'technical_guidelines.json'))) {
    techGuidelinesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'technical_guidelines.json'), 'utf8'));
  } else {
    techGuidelinesData = { guidelines: [] };
  }

  if (fs.existsSync(path.join(DATA_DIR, 'notices_comprehensive.json'))) {
    compNoticesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'notices_comprehensive.json'), 'utf8'));
  } else {
    compNoticesData = { notices: [] };
  }
}

loadDatabases();

// Helper: match substances from query (Specific registry + Comprehensive registry + General GHS rules)
function findSubstanceFromQuery(query) {
  loadDatabases();
  const qLower = query.toLowerCase().replace(/\s+/g, '');

  // 1. Check detailed substances
  for (const sub of substancesData.substances) {
    if (qLower.includes(sub.name_ko.toLowerCase().replace(/\s+/g, ''))) return sub;
    for (const alias of sub.aliases) {
      if (qLower.includes(alias.toLowerCase().replace(/\s+/g, ''))) return sub;
    }
  }

  // 2. Check master comprehensive registry
  for (const sub of masterMatrixData.comprehensive_substances_registry) {
    if (qLower.includes(sub.name_ko.toLowerCase().replace(/\s+/g, ''))) {
      return {
        name_ko: sub.name_ko,
        name_en: sub.name_ko,
        aliases: sub.aliases,
        cas_no: sub.cas_no,
        hazard_category: sub.category,
        regulation_cutoff_pct: sub.cutoff,
        threshold_quantities: {
          lower_tier_kg: sub.lower_t * 1000,
          lower_tier_ton: sub.lower_t,
          upper_tier_kg: sub.upper_t * 1000,
          upper_tier_ton: sub.upper_t,
          small_storage_kg: sub.small_t * 1000,
          small_storage_ton: sub.small_t,
          small_daily_kg: sub.small_t * 200
        },
        guidelines: `규제 기준 함량 ${sub.cutoff} 이상. 하위 규정수량 ${sub.lower_t}톤.`
      };
    }
    for (const alias of sub.aliases) {
      if (qLower.includes(alias.toLowerCase().replace(/\s+/g, ''))) {
        return {
          name_ko: sub.name_ko,
          name_en: sub.name_ko,
          aliases: sub.aliases,
          cas_no: sub.cas_no,
          hazard_category: sub.category,
          regulation_cutoff_pct: sub.cutoff,
          threshold_quantities: {
            lower_tier_kg: sub.lower_t * 1000,
            lower_tier_ton: sub.lower_t,
            upper_tier_kg: sub.upper_t * 1000,
            upper_tier_ton: sub.upper_t,
            small_storage_kg: sub.small_t * 1000,
            small_storage_ton: sub.small_t,
            small_daily_kg: sub.small_t * 200
          },
          guidelines: `규제 기준 함량 ${sub.cutoff} 이상. 하위 규정수량 ${sub.lower_t}톤.`
        };
      }
    }
  }

  // 3. Check General GHS Classification
  for (const rule of masterMatrixData.general_classification_rules) {
    const catShort = rule.category.toLowerCase().replace(/\s+/g, '');
    if (qLower.includes(catShort) || (qLower.includes('발암') && catShort.includes('만성')) || (qLower.includes('생태') && catShort.includes('생태'))) {
      return {
        name_ko: rule.category,
        name_en: 'General Hazard Class',
        aliases: [],
        cas_no: '-',
        hazard_category: rule.category,
        regulation_cutoff_pct: '고시 기준',
        threshold_quantities: {
          lower_tier_kg: rule.lower_tier_kg,
          lower_tier_ton: rule.lower_tier_ton,
          upper_tier_kg: rule.upper_tier_kg,
          upper_tier_ton: rule.upper_tier_ton,
          small_storage_kg: rule.small_storage_kg,
          small_storage_ton: rule.small_storage_ton,
          small_daily_kg: rule.small_storage_kg / 5
        },
        guidelines: rule.description
      };
    }
  }

  return null;
}

// Keyword tokenizer & normalizer
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 1);
}

// Key phrase priorities (Specific topics get ultra-high boost)
const TOPIC_PRIORITIES = [
  {
    topic: '개인보호구_고시_기준',
    keywords: ['개인보호구', '보호구', '방독마스크', '정화통', '보호복', '불산 보호구', '염산 마스크', '황산 보호구', '정화통 색상', 'a형 정화통', 'b형 정화통', 'k형', '보호복 1형식', '보호복 3형식', '보호장갑', '보호구 고시', '마스크 정화통', '개인보호구 고시'],
    targetMatrixId: 'CCA-016',
    targetQnaId: 'QNA-018'
  },
  {
    topic: '환경부_안전원_고시_목록',
    keywords: ['환경부고시', '안전원고시', '고시 목록', '고시 규정', '고시 기준', '화관법 고시', '화학물질 고시', '고시 체계'],
    targetMatrixId: null,
    targetQnaId: 'QNA-019'
  },
  {
    topic: '소량취급시설_별표1_수량',
    keywords: ['소량취급시설 기준', '소량고시 수량', '소량기준 표', '별표 1 수량', '소량 보관량', '일일 취급량', '소량 특례', '소량기준'],
    targetMatrixId: 'CCA-011',
    targetQnaId: 'QNA-020'
  },

  {
    topic: '확인명세서_누락',
    keywords: ['확인명세서', '확인결과서', '수입제품 확인', '화학물질 확인', '통관 누락', '1건 제출 누락', 'loc', 'letter of confirmation', 'cbi'],
    targetMatrixId: 'CCA-001',
    targetQnaId: 'QNA-001'
  },
  {
    topic: '관리자선임_미신고',
    keywords: ['관리자 선임', '관리자선임', '관리자 미선임', '선임 미신고', '관리자 신고', '해임신고', '퇴직신고', '직무대리자', '선임하고 신고', '관리자 선임하고'],
    targetMatrixId: 'CCA-007',
    targetQnaId: null
  },
  {
    topic: '도급신고_미이행',
    keywords: ['도급신고', '도급주고', '도급', '도급계약', '도급 미신고', '제31조'],
    targetMatrixId: 'CCA-008',
    targetQnaId: null
  },
  {
    topic: '안전교육_미실시',
    keywords: ['안전교육', '종사자 교육', '관리자 교육', '취급자 교육', '교육 미이수', '안전교육 안', '교육 안 시키면', '화학안전교육', '32시간', '8시간', '2시간'],
    targetMatrixId: 'CCA-009',
    targetQnaId: 'QNA-008'
  },
  {
    topic: '관리대장_점검대장',
    keywords: ['관리대장', '점검대장', '대장 누락', '작성 누락', '한달정도', '한달', '자체점검대장', '미작성'],
    targetMatrixId: 'CCA-013',
    targetQnaId: 'QNA-013'
  },
  {
    topic: '잠금장치_사고대비',
    keywords: ['잠금장치', '시건장치', '보관장소 잠금', '사고대비물질 잠금', '시건', '잠금장치 안했을때', '잠금장치 미설치'],
    targetMatrixId: 'CCA-012',
    targetQnaId: 'QNA-012'
  },
  {
    topic: '비상세안설비_기준',
    keywords: ['비상세안', '비상세안설비', '비상샤워', '세안기', '세척설비', '도보 10초', '수온 15', '15분 이상', '설치거리'],
    targetMatrixId: null,
    targetQnaId: 'QNA-009'
  },
  {
    topic: '소량취급시설_완화',
    keywords: ['소량 취급시설', '소량취급시설', '소량 고시', '소량기준', '소량 시설', '트레이 대체', '방류벽 면제'],
    targetMatrixId: 'CCA-011',
    targetQnaId: 'QNA-010'
  },
  {
    topic: '정기검사_취급시설',
    keywords: ['정기검사', '설치검사', '수시검사', '안전진단', '검사주기', '검사기준', '취급시설 검사', '검사기관', '환경공단', '가스안전공사', '안전보건공단', '저장탱크', '탱크', '정기검사 안받고'],
    targetMatrixId: 'CCA-006',
    targetQnaId: 'QNA-006'
  },
  {
    topic: '경고표지_표시의무',
    keywords: ['경고표지', 'msds 경고표지', '표시 훼손', '경고표지 훼손', '표시 미부착', '용기 표시', '그림문자 훼손', '표지 훼손'],
    targetMatrixId: 'CCA-014',
    targetQnaId: null
  },
  {
    topic: '화학사고_15분신고',
    keywords: ['화학사고 발생', '15분 이내', '즉시 신고', '사고 미신고', '화학사고 신고', '15분', '골든타임', '화학사고 났는데'],
    targetMatrixId: 'CCA-015',
    targetQnaId: null
  },
  {
    topic: '개인보호장구_미지급',
    keywords: ['개인보호장구', '보호장구 안 줬을 때', '방독마스크', '화학보호복', '보호복', '보호장갑', '보호안경', '개인보호장구 미지급', '보호장구'],
    targetMatrixId: 'CCA-016',
    targetQnaId: null
  },
  {
    topic: '주민고지_미이행',
    keywords: ['주민고지', '화학사고예방관리계획서 주민고지', '주민고지 안 했을 때', '지역주민 고지'],
    targetMatrixId: 'CCA-017',
    targetQnaId: null
  },
  {
    topic: '국내대리인_통보',
    keywords: ['국내대리인', '국외제조자', '선임된 국내대리인', '수입자한테 통보', '대리인 통보'],
    targetMatrixId: 'CCA-018',
    targetQnaId: null
  },
  {
    topic: '운반계획서_소량운반',
    keywords: ['운반계획서', '소량 운반', '운반자격증', '1톤 트럭', '질산 500kg', '운반계획서 제출', '운반기준', '운반차량'],
    targetMatrixId: null,
    targetQnaId: 'QNA-014'
  },
  {
    topic: '환기설비_배기구',
    keywords: ['환기설비', '배기구 높이', '배풍설비', '환기설비 기준', '실내 보관창고 환기', '환기 횟수', '바닥에서 배기구 높이'],
    targetMatrixId: null,
    targetQnaId: 'QNA-015'
  },
  {
    topic: '혼적금지_보관',
    keywords: ['혼적금지', '황산 가성소다 톨루엔', '같은 칸 보관', '혼적', '혼합보관', '이격거리 1m', '공동보관', '같은 칸에 같이'],
    targetMatrixId: null,
    targetQnaId: 'QNA-016'
  },
  {
    topic: '관리자_공동선임',
    keywords: ['공동안전관리자', '공동선임', '공동으로 선임', '관리자 공동', '2개 공장 관리자', '중소기업 공동선임'],
    targetMatrixId: null,
    targetQnaId: 'QNA-011'
  },
  {
    topic: '과징금_영업정지대체',
    keywords: ['과징금', '영업정지 대체', '과징금 부과', '매출액의 최대', '과징금 상한', '과징금은 매출액', '과징금 대체'],
    targetMatrixId: null,
    targetQnaId: 'QNA-017'
  },
  {
    topic: '인체등유해성물질수입',
    keywords: ['인체등유해성물질 수입신고', '인체등유해성물질 수입', '인체급성유해성물질', '인체만성유해성물질', '생태유해성물질', '유독물질 수입신고', '유독물질 수입', '유독물질 무신고', '유독물질 신고', '제한물질 수입허가'],
    targetMatrixId: 'CCA-002',
    targetQnaId: 'QNA-004'
  },
  {
    topic: '영업허가_차등',
    keywords: ['영업허가', '무허가 영업', '영업신고', '차등관리', '하위 규정수량', '최하위 규정수량'],
    targetMatrixId: 'CCA-005',
    targetQnaId: 'QNA-007'
  }
];

// Weighted score calculator
function scoreMatch(query, targetText, boostKeywords = []) {
  const queryLower = query.toLowerCase();
  const targetLower = targetText.toLowerCase();
  let score = 0;

  if (targetLower.includes(queryLower)) {
    score += 20;
  }

  const qTokens = tokenize(query);
  for (const token of qTokens) {
    if (token.length < 2) continue;
    if (targetLower.includes(token)) {
      score += token.length * 2;
    }
  }

  for (const bk of boostKeywords) {
    const bkLower = bk.toLowerCase();
    if (queryLower.includes(bkLower)) {
      score += 15;
    }
    for (const token of qTokens) {
      if (bkLower.includes(token) && token.length >= 2) {
        score += 8;
      }
    }
  }

  return score;
}

// Hybrid consultation engine
function consultLegalAgent(userQuery) {
  loadDatabases();
  const q = userQuery.trim();
  const qLower = q.toLowerCase();

  // Check matched substance
  const matchedSubstance = findSubstanceFromQuery(q);

  // 1. If user provided substance with tank/storage and inspection query
  if (matchedSubstance && (qLower.includes('정기검사') || qLower.includes('검사') || qLower.includes('저장탱크') || qLower.includes('탱크') || qLower.includes('사용') || qLower.includes('보관'))) {
    const sub = matchedSubstance;

    let tankSize = null;
    const matchTon = q.match(/(\d+(?:\.\d+)?)\s*(톤|ton|t|tonnes)/i);
    const matchKg = q.match(/(\d+(?:\.\d+)?)\s*(kg|킬로|키로)/i);
    if (matchTon) tankSize = parseFloat(matchTon[1]);
    else if (matchKg) tankSize = parseFloat(matchKg[1]) / 1000;

    let tierResult = '';
    let inspectionCycle = '';
    let pmpStatus = '';

    if (tankSize !== null) {
      if (tankSize >= sub.threshold_quantities.upper_tier_ton) {
        tierResult = `**화학사고예방관리계획서 1군 및 영업허가 사업장** (상위 규정수량 ${sub.threshold_quantities.upper_tier_ton}톤 이상)`;
        inspectionCycle = '**매 1년 주기 (연 1회)**';
        pmpStatus = '화학사고예방관리계획서 1군 필수 제출 대상 (5년 주기 주민고지 필수)';
      } else if (tankSize >= sub.threshold_quantities.lower_tier_ton) {
        tierResult = `**화학사고예방관리계획서 2군 및 영업허가 사업장** (하위 규정수량 ${sub.threshold_quantities.lower_tier_ton}톤 이상)`;
        inspectionCycle = '**매 1년 주기 (연 1회)**';
        pmpStatus = '화학사고예방관리계획서 2군 필수 제출 대상';
      } else if (tankSize >= sub.threshold_quantities.small_storage_ton) {
        tierResult = `**2025 개정 영업신고 대상 사업장** (하위 규정수량 ${sub.threshold_quantities.lower_tier_ton}톤 미만, 소량 초과)`;
        inspectionCycle = '**매 2년 주기 (2년 1회)**';
        pmpStatus = '화학사고예방관리계획서 제출 **면제** (하위 규정수량 미만)';
      } else {
        tierResult = `**소량 취급시설 / 영업신고 대상** (보관 ${sub.threshold_quantities.small_storage_ton}톤 이하)`;
        inspectionCycle = '**매 2년 주기 (소량 고시 간이검사 적용)**';
        pmpStatus = '화학사고예방관리계획서 제출 **면제**';
      }
    } else {
      tierResult = `하위 규정수량(${sub.threshold_quantities.lower_tier_ton}톤) 미만 시 영업신고 대상(2년 주기), 이상 시 영업허가 대상(1년 주기)`;
      inspectionCycle = '취급량에 따라 1년 또는 2년 주기';
    }

    const answerMarkdown = `### 📌 1. ${sub.name_ko} 취급량 및 2025년 개정 기준 진단
- **대상 물질**: **${sub.name_ko} (${sub.name_en || ''})** ${sub.cas_no !== '-' ? `[CAS No. ${sub.cas_no}]` : ''}
- **유해성 분류**: ${sub.hazard_category} (규제 기준: **${sub.regulation_cutoff_pct}**)
- **질문 사업장 상태**: ${tankSize ? `${tankSize}톤 저장/취급시설 보유` : '시설 사용'}
- **법적 판정 결과**: **${tierResult}**

---

### ⏰ 2. 정기검사 주기 및 화학사고예방관리계획서 판정
1. **정기검사 주기**: ${inspectionCycle}
   - **근거**: 화학물질관리법 제33조 및 동법 시행규칙 제33조 (2025년 10월 위험 비례형 차등관리제)
   - ${sub.name_ko}의 **하위 규정수량은 ${sub.threshold_quantities.lower_tier_ton}톤(${sub.threshold_quantities.lower_tier_kg.toLocaleString()}kg)**입니다.
   - ${tankSize ? `현재 시설 용량이 ${tankSize}톤이므로 **하위 규정수량(${sub.threshold_quantities.lower_tier_ton}톤) ${tankSize >= sub.threshold_quantities.lower_tier_ton ? '이상 ➡️ 매 1년 주기 정기검사 대상' : '미만 ➡️ 매 2년 주기 정기검사 대상'}**입니다.` : ''}
2. **화학사고예방관리계획서 (제23조)**: ${pmpStatus}

---

### 🏛️ 3. 공인 검사기관 및 신청 절차
- **검사기관 (3사 중 택1)**:
  1. **한국환경공단 (K-eco)**
  2. **한국가스안전공사 (KGS)**
  3. **한국산업안전보건공단 (KOSHA)**
- **신청 시점**: 검사 유효기간 만료일 **30일 전** 온라인 검사시스템 접수

---

### 📋 4. ${sub.name_ko} 취급시설 필수 설치·검사 기술기준 (화학물질안전원 지침)
1. **방류벽(Dyke) 설치**:
   - 저장탱크 용량의 **110% 이상** 체적 확보 필수 (${tankSize ? `${tankSize}톤 탱크 기준 최소 ${(tankSize * 1.1).toFixed(1)}톤(m³) 이상` : '탱크 용량의 110%'})
   - 재질: 내화학성 철근콘크리트, 높이 0.5m~3m, 바닥 구배 1/100 및 집수정(Sump) 필수
2. **배관 및 저장탱크 안전장치**:
   - 부식 방지 전용 재질 및 액위계(레벨게이지), 과충전 방지 경보장치, 원격 긴급차단밸브
   - 배관 용접부 방사선비파괴검사(RT) 20% 이상 수검
3. **누출 감지 및 비상대응 설비**:
   - 누출감지기 및 경보기 (누출우려점 반경 10~15m 이내 설치)
   - 작업 위치로부터 **도보 10초 이내(수온 15~35℃ 유지)에 비상세안·세척시설** 설치 필수
   - 개인보호구(불침투성 보호의, 내화학 장갑/장화, 안면보호구) 비치

---

### 🚨 5. 미수검 시 처벌 기준
- **형사 벌칙 (법 제59조제8호)**: 3년 이하의 징역 또는 5천만원 이하의 벌금
- **과태료 (법 제64조제1항제5호, 영 별표 2)**: 1차 600만원 / 2차 800만원 / 3차 1,000만원
- **행정처분 (규칙 별표 7)**: 1차 개선명령 ➡️ 2차 취급시설 사용중지명령`;

    return {
      query: q,
      match_type: 'substance_threshold_calc',
      title: `${sub.name_ko} 취급시설 정기검사 및 규정수량 산정 리포트`,
      answer: answerMarkdown,
      related_articles: ['화학물질관리법 제33조', '시행규칙 제33조', '시행령 제11조', '시행령 별표 2', '화학물질안전원 기술지침'],
      matrix_item: penaltiesMatrix.items.find(i => i.id === 'CCA-006'),
      suggested_actions: [
        `${sub.name_ko} 저장탱크 방류벽 110% 용량 확보 상태 점검`,
        '한국환경공단/가스안전공사 안전검사시스템 정기검사 신청',
        '비상세안설비 및 누출감지기 정상 작동 테스트'
      ]
    };
  }

  // 2. Direct Topic Priority Matching
  for (const p of TOPIC_PRIORITIES) {
    const matched = p.keywords.some(k => qLower.includes(k));
    if (matched) {
      if (p.targetQnaId) {
        const qna = qnaData.qna_list.find(item => item.id === p.targetQnaId);
        if (qna) {
          const matrixItem = p.targetMatrixId ? penaltiesMatrix.items.find(i => i.id === p.targetMatrixId) : null;
          return {
            query: q,
            match_type: 'topic_priority_qna',
            title: qna.question,
            answer: qna.answer,
            related_articles: qna.related_articles,
            matrix_item: matrixItem,
            suggested_actions: matrixItem ? matrixItem.practical_action_steps : []
          };
        }
      }

      if (p.targetMatrixId) {
        const matrixItem = penaltiesMatrix.items.find(i => i.id === p.targetMatrixId);
        if (matrixItem) {
          return formatMatrixResponse(q, matrixItem);
        }
      }
    }
  }

  // Fallback
  const matchedAct = actData.articles.filter(a => scoreMatch(q, a.title + ' ' + a.content) > 5);
  
  let fallbackAnswer = `### 📌 1. 법령 및 고시 검색 요약
문의하신 **"${q}"** 사안과 관련하여 **화학물질관리법 및 환경부·화학물질안전원 고시**를 분석하였습니다.

### ⚖️ 2. 관련 법령 조항
${matchedAct.length > 0 ? matchedAct.map(a => `#### 📄 ${a.article_no} [${a.title}]\n${a.content}\n`).join('\n') : '일치하는 직접 조항을 찾기 위해 보다 구체적인 키워드를 입력해 주세요.'}

### 🛡️ 3. 실무 가이드
- 화학물질관리법은 2025년 10월 개정으로 물질별 규정수량에 따라 **[영업허가(대량/1년주기) / 영업신고(중소량/2년주기) / 영업면제(극소량/3~4년주기)]** 3단계로 차등 관리됩니다.`;

  return {
    query: q,
    match_type: 'general_search',
    title: '화학물질관리법 관련 법령 검색 결과',
    answer: fallbackAnswer,
    related_articles: matchedAct.map(a => a.article_no),
    matrix_item: null,
    suggested_actions: [
      '취급 물질명 및 보유 수량으로 재질의',
      '과태료 계산기 메뉴에서 위반 항목별 시뮬레이션 실행'
    ]
  };
}

function formatMatrixResponse(query, item) {
  const answerMarkdown = `### 📌 1. 진단 요약 (2025년 개정 기준)
질문하신 사안은 **${item.statute_basis}**에 규정된 **${item.title}**에 해당합니다. 
의무 이행 시점은 **${item.obligation_timing}**이며, 규정 준수 여부를 점검해야 합니다.

### ⚖️ 2. 법적 근거 및 기준
- **근거 법률**: ${item.statute_basis}
- **핵심 실무 기준**:
${item.practical_action_steps.slice(0, 3).map(s => `- ${s}`).join('\n')}

### 🚨 3. 제재 및 처벌 수위 (위반 시)
- **제재 유형**: **${item.penalty_type}**
- **형사 벌칙**: ${item.criminal_penalty}
- **과태료 기준 (${item.administrative_fine ? item.administrative_fine.statute : '-'})**:
  - **1차 위반**: **${item.administrative_fine ? item.administrative_fine.first_offense_str : '-'}**
  - **2차 위반**: **${item.administrative_fine ? item.administrative_fine.second_offense_str : '-'}**
  - **3차 이상 위반**: **${item.administrative_fine ? item.administrative_fine.third_offense_str : '-'}**
- **행정처분 기준 (${item.administrative_disposition ? item.administrative_disposition.statute : '-'})**:
  - **1차 처분**: ${item.administrative_disposition ? item.administrative_disposition.first_offense : '-'}
  - **2차 처분**: ${item.administrative_disposition ? item.administrative_disposition.second_offense : '-'}
  - **3차 처분**: ${item.administrative_disposition ? item.administrative_disposition.third_offense : '-'}

### 🛡️ 4. 감경 사유 및 실무 조치 가이드
${item.mitigation_options.map(m => `- ${m}`).join('\n')}

**[권장 실행 조치]**
${item.practical_action_steps.map(s => `${s}`).join('\n')}`;

  return {
    query: query,
    match_type: 'matrix_matched',
    title: item.title,
    answer: answerMarkdown,
    related_articles: [item.statute_basis, item.administrative_fine ? item.administrative_fine.statute : '', item.administrative_disposition ? item.administrative_disposition.statute : ''],
    matrix_item: item,
    suggested_actions: item.practical_action_steps
  };
}

// Penalty calculator logic
function calculatePenalty(violationId, offenseLevel = 1, isVoluntary = false, isFirstTime = false, isEarlyPayment = false) {
  loadDatabases();
  const item = penaltiesMatrix.items.find(i => i.id === violationId);
  if (!item) {
    return { error: '존재하지 않는 위반 항목입니다.' };
  }

  let baseFine = 0;
  let baseFineStr = '';
  let dispStr = '';

  if (offenseLevel === 1) {
    baseFine = item.administrative_fine.first_offense;
    baseFineStr = item.administrative_fine.first_offense_str;
    dispStr = item.administrative_disposition.first_offense;
  } else if (offenseLevel === 2) {
    baseFine = item.administrative_fine.second_offense;
    baseFineStr = item.administrative_fine.second_offense_str;
    dispStr = item.administrative_disposition.second_offense;
  } else {
    baseFine = item.administrative_fine.third_offense;
    baseFineStr = item.administrative_fine.third_offense_str;
    dispStr = item.administrative_disposition.third_offense;
  }

  let calculatedFine = baseFine;
  const appliedReductions = [];

  if (baseFine > 0) {
    if (isVoluntary || isFirstTime) {
      calculatedFine = Math.floor(calculatedFine * 0.5);
      appliedReductions.push('화관법 시행령 별표 2 일반기준 1/2 감경 (자진신고 또는 최초 위반 등): -50%');
    }

    if (isEarlyPayment) {
      const discount = Math.floor(calculatedFine * 0.2);
      calculatedFine = calculatedFine - discount;
      appliedReductions.push('질서위반행위규제법 제18조 의견제출 기한 내 자진납부 감경: -20%');
    }
  }

  return {
    item_id: item.id,
    title: item.title,
    statute_basis: item.statute_basis,
    criminal_penalty: item.criminal_penalty,
    base_fine: baseFine,
    base_fine_str: baseFineStr,
    calculated_fine: calculatedFine,
    calculated_fine_str: baseFine > 0 ? `${(calculatedFine / 10000).toLocaleString()}만원 (${calculatedFine.toLocaleString()}원)` : '해당 없음 (형사처벌 또는 과태료 비대상)',
    disposition: dispStr,
    applied_reductions: appliedReductions,
    practical_actions: item.practical_action_steps
  };
}

// 3-Tier Statute Explorer
function get3TierStatutes() {
  loadDatabases();
  return {
    act: actData,
    decree: decreeData,
    rule: ruleData,
    notices: noticesData,
    penalties_matrix: penaltiesMatrix,
    substances: substancesData,
    master_matrix: masterMatrixData,
    technical_guidelines: techGuidelinesData,
    comprehensive_notices: compNoticesData
  };
}

// Interactive compliance checklist
function getComplianceChecklist() {
  return [
    {
      stage: '수입 전 (통관 전 필수)',
      items: [
        {
          id: 'chk-1',
          task: '화학물질 확인명세서(확인결과서) 제출',
          legal_ref: '법 제9조, 규칙 제2조',
          deadline: '수입 통관 전',
          agency: '한국화학물질관리협회 (KCMA)',
          risk: '미제출 시 과태료 최대 1,000만원 (1차 600만원)'
        },
        {
          id: 'chk-2',
          task: 'Letter of Confirmation (LOC) 또는 100% 전성분표 확보',
          legal_ref: '환경부고시 제2024-2호',
          deadline: '발주/선적 전',
          agency: '해외 제조사',
          risk: '성분 미확인 시 허위확인명세서 제출 리스크 (영업정지 1개월)'
        },
        {
          id: 'chk-3',
          task: '인체등유해성물질(급성·만성·생태) 수입신고 (해당 시)',
          legal_ref: '법 제20조',
          deadline: '수입 전',
          agency: '유역(지방)환경청',
          risk: '미신고 시 3년 이하 징역 또는 5천만원 이하 벌금'
        }
      ]
    },
    {
      stage: '취급시설 설치 및 안전 검사',
      items: [
        {
          id: 'chk-inspection-1',
          task: '취급시설 설치검사 (가동 전)',
          legal_ref: '법 제33조제1항, 규칙 제33조',
          deadline: '시설 가동 전',
          agency: '환경공단 / 가스안전공사 / 안전보건공단',
          risk: '미수검 운전 시 3년 이하 징역 또는 5천만원 이하 벌금'
        },
        {
          id: 'chk-inspection-2',
          task: '정기검사 수검 (대량 1년, 중소량 2년 차등 주기)',
          legal_ref: '법 제33조, 규칙 제33조',
          deadline: '검사 유효기간 만료 30일 전 신청',
          agency: '전문 검사기관 3사',
          risk: '미수검 시 과태료 최대 1,000만원 + 사용중지명령'
        },
        {
          id: 'chk-tech-1',
          task: '방류벽 110% 및 비상세안설비(도보 10초) 점검',
          legal_ref: '시행규칙 [별표 5], 안전원 기술지침',
          deadline: '상시 유지',
          agency: '사업장 자체',
          risk: '기준 미달 시 검사 불합격 및 사용중지'
        }
      ]
    },
    {
      stage: '보관·취급 및 영업 운영 단계',
      items: [
        {
          id: 'chk-5',
          task: '유해화학물질 영업허가 또는 영업신고 취득',
          legal_ref: '법 제27조',
          deadline: '영업 개시 전',
          agency: '유역(지방)환경청',
          risk: '무허가 3년/5천만, 무신고 1년/1천만'
        },
        {
          id: 'chk-6',
          task: '유해화학물질관리자 선임 및 신고',
          legal_ref: '법 제32조, 환경부고시 제2023-14호',
          deadline: '선임 후 30일 이내',
          agency: '유역(지방)환경청',
          risk: '미선임 시 과태료 최대 1,000만원 (1차 600만원)'
        },
        {
          id: 'chk-edu-1',
          task: '종사자 및 관리자 정기 안전교육 이수',
          legal_ref: '법 제33조, 안전원고시 제2024-5호',
          deadline: '관리자 2년 32시간, 취급자 연 8시간',
          agency: '화학물질안전원 사이버교육센터',
          risk: '미이수 시 과태료 최대 600만원 (1차 180만원)'
        },
        {
          id: 'chk-8',
          task: '취급시설 주 1회 자체점검 대장 작성 및 5년 보존',
          legal_ref: '법 제35조',
          deadline: '주 1회 상시',
          agency: '사업장 자체',
          risk: '미실시 시 과태료 최대 600만원 (1차 180만원)'
        }
      ]
    }
  ];
}

// ========================================================
// 🧪 K-REACH (화학물질등록평가법) Support Engine
// ========================================================
let kreachActData, kreachDecreeData, kreachPenaltiesData, kreachQnaData, kreachChecklistData;

function loadKReachDatabases() {
  if (fs.existsSync(path.join(DATA_DIR, 'kreach_act.json'))) {
    kreachActData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'kreach_act.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(DATA_DIR, 'kreach_decree.json'))) {
    kreachDecreeData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'kreach_decree.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(DATA_DIR, 'kreach_penalties.json'))) {
    kreachPenaltiesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'kreach_penalties.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(DATA_DIR, 'kreach_qna.json'))) {
    kreachQnaData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'kreach_qna.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(DATA_DIR, 'kreach_checklist.json'))) {
    kreachChecklistData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'kreach_checklist.json'), 'utf8'));
  }
}

loadKReachDatabases();

function getKReachStatutes() {
  loadKReachDatabases();
  return {
    act: kreachActData,
    decree: kreachDecreeData,
    penalties_matrix: kreachPenaltiesData,
    qna_database: kreachQnaData
  };
}

function getKReachComplianceChecklist() {
  loadKReachDatabases();
  return kreachChecklistData ? kreachChecklistData.stages : [];
}

const KREACH_TOPICS = [
  // 1. Specific Chemical / Raw Material Exemptions (Highest Priority)
  {
    topic: '글리세린_별표1_면제',
    keywords: ['글리세린', 'glycerin', '56-81-5', '별표 1 면제', '별표1 면제', '글리세린 수입', '글리세린 50톤'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-016'
  },
  {
    topic: '수소첨가_경화유_변성유지',
    keywords: ['수소첨가', '경화유', 'hydrogenated', '변성 유지', '경화 팜유', '수소첨가 반응'],
    targetMatrixId: 'KREACH-001',
    targetQnaId: 'KQNA-017'
  },
  {
    topic: '천연추출물_식물성유지_면제',
    keywords: ['호호바', '천연 식물 추출물', '식물 추출물', '단순 압착', '비변형 천연물질', '식물성 오일 면제', '호호바씨오일'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-013'
  },
  {
    topic: '비분리_중간체_면제',
    keywords: ['비분리 중간체', 'non-isolated', '반응기 안에서', '반응 중간체', '중간체 면제'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-014'
  },
  {
    topic: '전량_수출용_면제',
    keywords: ['전량 해외로 수출', '전량 국외 수출', '전량 수출용', '재수출 원료', '수출용 원료', '전량 해외'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-015'
  },
  {
    topic: '신규단량체_2프로_면제',
    keywords: ['단량체', '모노머', 'monomer', '1.5%', '2%', '신규 단량체', '고분자 단량체'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-012'
  },
  {
    topic: '고분자_Mn_면제',
    keywords: ['수평균분자량', 'mn 10', 'mn 12', 'mn 10000', 'mn 12000', '고분자 면제', 'polymer 면제', '저분자 함량', '증점제 고분자', '증점제로 쓰이는 고분자'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-011'
  },
  {
    topic: '성형_완제품_Article_면제',
    keywords: ['성형 완제품', '완제품(article)', '플라스틱 캡', '플라스틱 용기', '용기 완제품', '완제품 article', 'article'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-018'
  },
  {
    topic: '화장품_원료_면제불가',
    keywords: ['화장품 제조사', '화장품 원료', '화장품법 적용받으니', '화장품 제조용', '화장품 계면활성제'],
    targetMatrixId: 'KREACH-001',
    targetQnaId: 'KQNA-009'
  },
  {
    topic: '세제_생활화학제품_원료_면제불가',
    keywords: ['세탁세제', '안전확인대상생활화학제품', '음이온 계면활성제', 'las', '세제 제조용', '세제 원료'],
    targetMatrixId: 'KREACH-001',
    targetQnaId: 'KQNA-010'
  },
  {
    topic: '손소독제_의약외품_원료_면제불가',
    keywords: ['손소독제', '의약외품', '에탄올 원료', '약사법 적용', '주방세제 원료', '위생용품 원료'],
    targetMatrixId: 'KREACH-001',
    targetQnaId: 'KQNA-019'
  },

  // 2. Procedural & Compliance Topics
  {
    topic: '공동등록_협의체_LOA',
    keywords: ['공동등록', 'cico', '협의체', '대표등록자', 'loa', '시험자료 소유권', '비용 분담', '제15조'],
    targetMatrixId: null,
    targetQnaId: 'KQNA-007'
  },
  {
    topic: '변경등록_제12조',
    keywords: ['변경등록', '톤수 범위 변경', '용도 변경', '수입량 증가', '제12조', '변경등록 기한', '변경등록 벌칙', '톤수 범위가 바뀌었을 때'],
    targetMatrixId: 'KREACH-005',
    targetQnaId: 'KQNA-006'
  },
  {
    topic: '국외대리인_OR',
    keywords: ['국외대리인', 'or', 'only representative', '해외 본사 cbi', 'or 선임', '수입자 통보', '수입자 통보 안 하면'],
    targetMatrixId: 'KREACH-008',
    targetQnaId: 'KQNA-004'
  },
  {
    topic: '정보제공_제29조',
    keywords: ['제29조', '정보제공', '물질안전정보 전달', '등록번호 제공', '양도 시 정보제공', '납품할 때 등록번호', '거래처에 납품할 때', '안전정보 안 주면', '등록번호랑 안전정보'],
    targetMatrixId: 'KREACH-006',
    targetQnaId: 'KQNA-005'
  },
  {
    topic: '실적기록보존_제43조',
    keywords: ['실적 대장', '실적대장', '제조 수입 판매', '실적 서류', '기록보존', '기록 보존', '대장 작성', '제43조', '5년간 기록보존', '실적 대장을 작성 안 했을 때', '화평법 대장'],
    targetMatrixId: 'KREACH-009',
    targetQnaId: 'KQNA-008'
  },
  {
    topic: '연구개발_면제확인',
    keywords: ['연구개발 면제', 'r&d 면제', '등록면제확인', '시약 면제', 'r&d 등록면제', '면제확인', '제11조', '시약을 수입', '시제품 생산용', '파일럿 라인'],
    targetMatrixId: 'KREACH-004',
    targetQnaId: 'KQNA-003'
  },
  {
    topic: '신규화학물질_등록신고',
    keywords: ['신규화학물질', '1톤 미만', '1톤 이상', '100kg', '100kg 미만', '신규물질 등록', '신규물질 신고', '소량 신규물질', '신규물질 수량', '신규화학물질 기준'],
    targetMatrixId: 'KREACH-002',
    targetQnaId: 'KQNA-002'
  },
  {
    topic: '기존화학물질_등록유예',
    keywords: ['기존화학물질', '등록 유예기간', '유예기간', '100톤 등록', '10톤 등록', '2024년 12월 31일', '2027년', '2030년', '1톤 이상 등록', '5톤 수입', '등록 안 하고 수입'],
    targetMatrixId: 'KREACH-001',
    targetQnaId: 'KQNA-001'
  }
];

function consultKReachLegalAgent(query) {
  loadKReachDatabases();
  const qClean = query.replace(/[^\w가-힣\s]/g, ' ').toLowerCase();

  // 1. Topic Match
  for (const t of KREACH_TOPICS) {
    const match = t.keywords.some(kw => qClean.includes(kw.toLowerCase()));
    if (match) {
      if (t.targetQnaId && kreachQnaData) {
        const qna = kreachQnaData.qna_list.find(q => q.id === t.targetQnaId);
        if (qna) {
          const matrixItem = t.targetMatrixId ? kreachPenaltiesData.items.find(m => m.id === t.targetMatrixId) : null;
          return {
            query,
            match_type: 'kreach_direct_qna',
            title: qna.question,
            answer: qna.answer,
            related_articles: qna.related_articles,
            matrix_item: matrixItem,
            suggested_actions: matrixItem ? matrixItem.practical_action_steps : []
          };
        }
      }

      if (t.targetMatrixId && kreachPenaltiesData) {
        const item = kreachPenaltiesData.items.find(m => m.id === t.targetMatrixId);
        if (item) {
          return {
            query,
            match_type: 'kreach_penalty_matrix',
            title: item.title,
            answer: `### 📌 1. 핵심 처벌 수위 직답 (형사벌칙 / 행정처분 / 과태료)
- **형사 벌칙**: ${item.criminal_penalty}
- **과태료**: ${item.administrative_fine ? `${item.administrative_fine.statute} (1차: ${item.administrative_fine.first_offense_str}, 2차: ${item.administrative_fine.second_offense_str}, 3차: ${item.administrative_fine.third_offense_str})` : '해당 없음 (형사벌칙 우선)'}
- **행정 처분**: ${item.administrative_disposition.first_offense} ➡️ ${item.administrative_disposition.second_offense}

### ⚖️ 2. 법적 근거
- **근거 법조문**: **${item.statute_basis}**

### 🛡️ 3. 실무 대응 및 감경 가이드
${item.mitigation_options.map(m => `• ${m}`).join('\n')}`,
            related_articles: [item.statute_basis.split(',')[0]],
            matrix_item: item,
            suggested_actions: item.practical_action_steps
          };
        }
      }
    }
  }

  // Fallback: Article search
  return {
    query,
    match_type: 'kreach_statute_search',
    title: '화학물질등록평가법(화평법) 종합 진단',
    answer: `### 📌 1. 화평법 기본 규정 안내
문의하신 사안과 관련하여 **화학물질의 등록 및 평가 등에 관한 법률(화평법)** 규정을 안내합니다.

- **기존화학물질 (연간 1톤 이상)**: 톤수별 유예기간 내 국립환경과학원에 공동등록(CICO) 완료 필수.
- **신규화학물질 (2025 개정)**: 연간 1톤 이상은 본등록, 연간 1톤 미만은 간이신고 의무 (종전 100kg에서 1톤으로 완화).
- **연구개발(R&D) 시약**: 한국화학물질관리협회(KCMA)에 제조·수입 전 '등록면제확인' 필수 수검.
- **위반 시 제재**: 무등록 제조·수입 시 5년 이하의 징역 또는 1억원 이하의 벌금 (매출액 5% 이하 과징금).`,
    related_articles: ['화평법 제10조', '화평법 제11조', '화평법 제14조', '화평법 제49조'],
    matrix_item: null,
    suggested_actions: ['제조·수입 전 기존/신규화학물질 여부 확인', 'CICO 협의체 가입 및 등록일정 수립']
  };
}

module.exports = {
  consultLegalAgent,
  calculatePenalty,
  get3TierStatutes,
  getComplianceChecklist,
  findSubstanceFromQuery,
  getKReachStatutes,
  getKReachComplianceChecklist,
  consultKReachLegalAgent
};
