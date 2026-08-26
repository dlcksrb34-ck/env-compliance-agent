/**
 * 법령 및 고시 업데이트 관리 스크립트
 * 1. 국가법령정보센터 Open API 또는 환경부 공포 고시 데이터를 연동
 * 2. data/ 디렉터리의 법률(act), 시행령(decree), 시행규칙(rule), 고시(notices, substances)를 안전하게 최신화
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

// 백업 기능 (업데이트 전 기존 DB 자동 백업)
function backupCurrentDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(__dirname, '../backups', `backup_${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const files = ['act.json', 'decree.json', 'rule.json', 'notices.json', 'substances_comprehensive_matrix.json', 'penalties_matrix.json', 'qna_database.json'];
  
  files.forEach(file => {
    const src = path.join(DATA_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(backupDir, file));
    }
  });

  console.log(`✅ 기존 법률 데이터베이스가 안전하게 백업되었습니다: ${backupDir}`);
  return backupDir;
}

// 법령 버전 검사 및 업데이트 상태 리포트
function checkStatuteStatus() {
  const act = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'act.json'), 'utf8'));
  const decree = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'decree.json'), 'utf8'));
  const rule = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'rule.json'), 'utf8'));
  const master = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'substances_comprehensive_matrix.json'), 'utf8'));

  return {
    act_name: act.law_name,
    act_version: act.law_number,
    act_enforcement: act.enforcement_date,
    decree_version: decree.law_number,
    rule_version: rule.law_number,
    substances_count: master.comprehensive_substances_registry.length,
    general_rules_count: master.general_classification_rules.length,
    last_checked: new Date().toLocaleString('ko-KR')
  };
}

module.exports = {
  backupCurrentDatabase,
  checkStatuteStatus
};

if (require.main === module) {
  console.log('=== 🌿 환경규제 법률 DB 상태 점검 ===');
  console.log(checkStatuteStatus());
}
