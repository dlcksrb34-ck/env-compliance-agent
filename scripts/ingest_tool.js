/**
 * 환경규제 법률 지식베이스 확장 및 자동 수집(Ingestion) 도구
 * HWP, PDF, 텍스트, 웹페이지 원문을 분석하여 data/ 디렉터리의 정형 JSON으로 자동 변환 적재
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

/**
 * 1. 신규 기술지침/고시 문서 추가 함수
 */
function appendGuideline({ id, title, issuer, issueDate, category, keyRequirements, relatedStatute }) {
  const guidelinesPath = path.join(DATA_DIR, 'technical_guidelines.json');
  let data = { guidelines: [] };
  
  if (fs.existsSync(guidelinesPath)) {
    data = JSON.parse(fs.readFileSync(guidelinesPath, 'utf8'));
  }

  // 중복 체크
  const idx = data.guidelines.findIndex(g => g.id === id);
  if (idx >= 0) {
    data.guidelines[idx] = { id, title, issuer, issueDate, category, keyRequirements, relatedStatute };
  } else {
    data.guidelines.push({ id, title, issuer, issueDate, category, keyRequirements, relatedStatute });
  }

  fs.writeFileSync(guidelinesPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ [기술지침 적재 완료] ${id}: ${title}`);
}

/**
 * 2. 신규 실무 질의회신(Q&A) 대량 추가 함수
 */
function appendQnaBatch(newQnaList) {
  const qnaPath = path.join(DATA_DIR, 'qna_database.json');
  let data = { qna_list: [] };
  
  if (fs.existsSync(qnaPath)) {
    data = JSON.parse(fs.readFileSync(qnaPath, 'utf8'));
  }

  newQnaList.forEach(qna => {
    const idx = data.qna_list.findIndex(item => item.id === qna.id);
    if (idx >= 0) {
      data.qna_list[idx] = qna;
    } else {
      data.qna_list.push(qna);
    }
  });

  fs.writeFileSync(qnaPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ [Q&A 적재 완료] 총 ${newQnaList.length}건 추가/갱신 완료`);
}

/**
 * 3. 타 환경법(대기/수질/폐기물) 확장 템플릿 생성 함수
 */
function createNewLawDomain(domainName, domainTitle, primaryArticles = []) {
  const filePath = path.join(DATA_DIR, `${domainName}.json`);
  const domainData = {
    domain_code: domainName,
    law_name: domainTitle,
    created_at: new Date().toISOString(),
    articles: primaryArticles
  };

  fs.writeFileSync(filePath, JSON.stringify(domainData, null, 2), 'utf8');
  console.log(`✅ [신규 환경법 도메인 생성] ${domainTitle} (${filePath})`);
}

module.exports = {
  appendGuideline,
  appendQnaBatch,
  createNewLawDomain
};

// 테스트 실행 (화학물질안전원 기술지침 예시 적재)
if (require.main === module) {
  appendGuideline({
    id: "NICS-GUIDE-001",
    title: "유해화학물질 실외 저장시설 방류벽 설치 및 유지관리 세부지침",
    issuer: "화학물질안전원",
    issueDate: "2025-01-15",
    category: "취급시설 기술기준",
    keyRequirements: [
      "방류벽 용량은 최대 저장탱크 용량의 110% 이상 확보",
      "방류벽 높이는 0.5m 이상 3m 이하, 두께 0.2m 이상 철근콘크리트 구조",
      "방류벽 내 집수조(Sump) 및 배수밸브(상시 닫힘 상태 유지) 설치",
      "방류벽 내 다른 유류 및 위험물 저장탱크와 혼합 설치 금지"
    ],
    relatedStatute: "화관법 시행규칙 제33조 [별표 5]"
  });
}
