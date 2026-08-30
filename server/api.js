require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const legalEngine = require('./legal_engine');
const llmEngine = require('./llm_engine');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

app.set('trust proxy', true);
app.use(cors());
// Disable caching completely for instant mobile updates
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
}));

const smartRouter = require('./smart_router');

// Helper: Get real client IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
}

// In-Memory + Persistent Access Logging (Reliable Disk Sync)
const DATA_DIR = path.join(__dirname, '../data');
const LOG_FILE = path.join(DATA_DIR, 'access_logs.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create data directory:', e.message);
  }
}

let accessLogs = [];
try {
  if (fs.existsSync(LOG_FILE)) {
    const raw = fs.readFileSync(LOG_FILE, 'utf8');
    accessLogs = JSON.parse(raw);
    if (!Array.isArray(accessLogs)) accessLogs = [];
    console.log(`📊 [사용이력] 기존 접속 로그 ${accessLogs.length}건 안전하게 로드 완료`);
  } else {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2), 'utf8');
    console.log(`📊 [사용이력] 신규 로그 파일 생성 완료: ${LOG_FILE}`);
  }
} catch (e) {
  console.error('⚠️ [사용이력] 로그 파일 로드 중 오류 발생:', e.message);
  accessLogs = [];
}

function recordLog(entry) {
  accessLogs.unshift(entry);
  if (accessLogs.length > 1000) accessLogs = accessLogs.slice(0, 1000);
  try {
    // Synchronously write up to 1,000 logs to disk to prevent any loss
    fs.writeFileSync(LOG_FILE, JSON.stringify(accessLogs, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ [사용이력] 로그 디스크 저장 실패:', e.message);
  }
}

// Admin Auth Middleware
function checkAdminAuth(req, res, next) {
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  if (pin && pin === ADMIN_PIN) {
    return next();
  }
  return res.status(403).json({ error: '관리자 인증 실패: 올바른 비밀번호를 입력해 주세요.' });
}

// Admin PIN verify endpoint
app.post('/api/admin/verify', (req, res) => {
  const { pin } = req.body;
  if (pin && pin === ADMIN_PIN) {
    return res.json({ success: true, message: '관리자 인증 성공' });
  }
  return res.status(403).json({ error: '비밀번호가 일치하지 않습니다.' });
});

// Admin logs endpoint (Protected)
app.get('/api/admin/logs', checkAdminAuth, (req, res) => {
  const uniqueIps = new Set(accessLogs.map(l => l.ip)).size;
  const totalTokens = accessLogs.reduce((acc, l) => acc + (Number(l.tokens) || 0), 0);
  res.json({
    total_count: accessLogs.length,
    unique_ips: uniqueIps,
    total_tokens: totalTokens,
    logs: accessLogs
  });
});

// Admin clear logs endpoint (Protected)
app.delete('/api/admin/logs', checkAdminAuth, (req, res) => {
  accessLogs = [];
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify([], null, 2));
  } catch (e) {}
  console.log('[관리자] 접속 로그가 초기화되었습니다.');
  res.json({ success: true, message: '로그가 성공적으로 초기화되었습니다.' });
});

// Consultation endpoint (Supports Smart Caching + Selective LLM + Local Engine + IP Logging)
app.post('/api/consult', async (req, res) => {
  try {
    const { query, apiKey, model, forceFresh, law } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
    }

    const clientIp = getClientIp(req);
    const kstTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const effectiveApiKey = apiKey || process.env.OPENAI_API_KEY;
    const selectedModel = model || 'gpt-5.5';
    const effectiveLaw = law || 'cca';

    let result;

    // 1. Check In-Memory Cache (Token cost: 0)
    if (!forceFresh) {
      const cached = smartRouter.getCachedResponse(`${effectiveLaw}_${query}`, selectedModel);
      if (cached) {
        result = cached;
      }
    }

    // 2. If API Key provided, call LLM with pruned RAG grounding
    if (!result && effectiveApiKey && effectiveApiKey.trim()) {
      try {
        const llmResult = await llmEngine.consultWithLLM({
          query,
          apiKey: effectiveApiKey,
          model: selectedModel,
          law: effectiveLaw
        });
        smartRouter.setCachedResponse(`${effectiveLaw}_${query}`, selectedModel, llmResult);
        result = llmResult;
      } catch (llmErr) {
        console.warn(`[LLM 오류] IP: ${clientIp} | fallback:`, llmErr.message);
        const fallback = effectiveLaw === 'kreach' ? legalEngine.consultKReachLegalAgent(query) : legalEngine.consultLegalAgent(query);
        fallback.llm_error = llmErr.message;
        result = fallback;
      }
    }

    // 3. Default Local Hybrid Engine (Token cost: 0)
    if (!result) {
      smartRouter.recordLocalHit();
      result = effectiveLaw === 'kreach' ? legalEngine.consultKReachLegalAgent(query) : legalEngine.consultLegalAgent(query);
    }

    // Record Access Log
    const engineName = result.engine || (effectiveApiKey ? selectedModel : '로컬 룰 엔진');
    const costKrw = result.tokens && result.tokens.cost_krw ? result.tokens.cost_krw : '0원';
    const totalTokens = result.tokens && result.tokens.total_tokens ? result.tokens.total_tokens : 0;

    const logEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      kst_time: kstTime,
      ip: clientIp,
      userAgent: req.headers['user-agent'] || '',
      type: '질문 상담',
      law: effectiveLaw === 'kreach' ? '화평법' : '화관법',
      query: query.trim(),
      engine: engineName,
      tokens: totalTokens,
      cost_krw: costKrw
    };
    recordLog(logEntry);

    // Terminal console log
    console.log(`[접속로그] 🕒 ${kstTime} | 🌐 IP: ${clientIp} | ⚖️ ${logEntry.law} | 💬 "${query.trim().replace(/\r?\n/g, ' ')}" | 🧠 ${engineName} | 💰 ${costKrw}`);

    return res.json(result);
  } catch (err) {
    console.error('Consultation error:', err);
    res.status(500).json({ error: '법률 분석 중 오류가 발생했습니다: ' + err.message });
  }
});

// Optimization stats endpoint
app.get('/api/optimization-stats', (req, res) => {
  res.json(smartRouter.getOptimizationStats());
});

// Test API Key endpoint
app.post('/api/test-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: 'API 키를 입력해 주세요.' });
    }
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: apiKey.trim() });
    await openai.models.list();
    res.json({ success: true, message: 'OpenAI API 키가 유효하게 확인되었습니다.' });
  } catch (err) {
    res.status(400).json({ error: 'API 키 확인 실패: ' + err.message });
  }
});

// Penalty calculator endpoint
app.post('/api/calculate-penalty', (req, res) => {
  try {
    const { violationId, offenseLevel, isVoluntary, isFirstTime, isEarlyPayment } = req.body;
    if (!violationId) {
      return res.status(400).json({ error: '위반 항목을 선택해 주세요.' });
    }
    const clientIp = getClientIp(req);
    const kstTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const result = legalEngine.calculatePenalty(
      violationId,
      Number(offenseLevel) || 1,
      Boolean(isVoluntary),
      Boolean(isFirstTime),
      Boolean(isEarlyPayment)
    );

    const logEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      kst_time: kstTime,
      ip: clientIp,
      userAgent: req.headers['user-agent'] || '',
      type: '과태료 계산',
      law: '화관법',
      query: `과태료 시뮬레이션: ${result.statute ? result.statute.title : violationId} (${offenseLevel}차)`,
      engine: '시뮬레이터',
      tokens: 0,
      cost_krw: '0원'
    };
    recordLog(logEntry);
    console.log(`[접속로그] 🕒 ${kstTime} | 🌐 IP: ${clientIp} | 🧮 과태료 시뮬레이션: ${violationId} (${offenseLevel}차)`);

    res.json(result);
  } catch (err) {
    console.error('Penalty calculation error:', err);
    res.status(500).json({ error: '과태료 계산 중 오류가 발생했습니다.' });
  }
});

// Full 3-Tier Statutes endpoint
app.get('/api/statutes', (req, res) => {
  try {
    const statutes = legalEngine.get3TierStatutes();
    res.json(statutes);
  } catch (err) {
    res.status(500).json({ error: '법령 데이터 로드 실패' });
  }
});

// Violations list
app.get('/api/violations-list', (req, res) => {
  try {
    const statutes = legalEngine.get3TierStatutes();
    res.json(statutes.penalties_matrix.items);
  } catch (err) {
    res.status(500).json({ error: '위반 매트릭스 로드 실패' });
  }
});

// Checklist endpoint
app.get('/api/checklist', (req, res) => {
  try {
    const list = legalEngine.getComplianceChecklist();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: '체크리스트 로드 실패' });
  }
});

// K-REACH (화평법) 3-Tier Statutes endpoint
app.get('/api/kreach/statutes', (req, res) => {
  try {
    const statutes = legalEngine.getKReachStatutes();
    res.json(statutes);
  } catch (err) {
    res.status(500).json({ error: '화평법 데이터 로드 실패' });
  }
});

// K-REACH (화평법) Violations list
app.get('/api/kreach/violations-list', (req, res) => {
  try {
    const statutes = legalEngine.getKReachStatutes();
    res.json(statutes.penalties_matrix.items);
  } catch (err) {
    res.status(500).json({ error: '화평법 위반 매트릭스 로드 실패' });
  }
});

// K-REACH (화평법) Checklist endpoint
app.get('/api/kreach/checklist', (req, res) => {
  try {
    const list = legalEngine.getKReachComplianceChecklist();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: '화평법 체크리스트 로드 실패' });
  }
});

// 6 Core Environmental Laws Registry
app.get('/api/laws', (req, res) => {
  try {
    const lawsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/laws_registry.json'), 'utf8'));
    res.json(lawsData.laws);
  } catch (err) {
    res.status(500).json({ error: '환경법 레지스트리 로드 실패' });
  }
});


// Comprehensive 12 Notices endpoint
app.get('/api/notices', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/notices_comprehensive.json'), 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '고시 데이터 로드 실패' });
  }
});

// PPE Guidelines endpoint
app.get('/api/ppe-matrix', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/ppe_guidelines.json'), 'utf8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '보호구 데이터 로드 실패' });
  }
});

// Root fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌿 환경규제 AI 에이전트 (화학물질관리법 특화)`);
  console.log(`🤖 OpenAI LLM + 로컬 법률 RAG 지원 서버 구동`);
  console.log(`🔒 관리자 인증(PIN) 보호 활성화`);
  console.log(`🚀 서버 주소: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
