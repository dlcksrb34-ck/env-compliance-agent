require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const legalEngine = require('./legal_engine');
const llmEngine = require('./llm_engine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const smartRouter = require('./smart_router');

// Consultation endpoint (Supports Smart Caching + Selective LLM + Local Engine)
app.post('/api/consult', async (req, res) => {
  try {
    const { query, apiKey, model, forceFresh, law } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: '질문 내용을 입력해 주세요.' });
    }

    const effectiveApiKey = apiKey || process.env.OPENAI_API_KEY;
    const selectedModel = model || 'gpt-5.5';
    const effectiveLaw = law || 'cca';

    // 1. Check In-Memory Cache (Token cost: 0)
    if (!forceFresh) {
      const cached = smartRouter.getCachedResponse(`${effectiveLaw}_${query}`, selectedModel);
      if (cached) {
        return res.json(cached);
      }
    }

    // 2. If API Key provided, call LLM with pruned RAG grounding
    if (effectiveApiKey && effectiveApiKey.trim()) {
      try {
        const llmResult = await llmEngine.consultWithLLM({
          query,
          apiKey: effectiveApiKey,
          model: selectedModel,
          law: effectiveLaw
        });
        
        // Cache result
        smartRouter.setCachedResponse(`${effectiveLaw}_${query}`, selectedModel, llmResult);
        return res.json(llmResult);
      } catch (llmErr) {
        console.warn('LLM consultation error, falling back to local engine:', llmErr.message);
        const fallback = effectiveLaw === 'kreach' ? legalEngine.consultKReachLegalAgent(query) : legalEngine.consultLegalAgent(query);
        fallback.llm_error = llmErr.message;
        return res.json(fallback);
      }
    }

    // 3. Default Local Hybrid Engine (Token cost: 0)
    smartRouter.recordLocalHit();
    const result = effectiveLaw === 'kreach' ? legalEngine.consultKReachLegalAgent(query) : legalEngine.consultLegalAgent(query);
    res.json(result);
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
    const result = legalEngine.calculatePenalty(
      violationId,
      Number(offenseLevel) || 1,
      Boolean(isVoluntary),
      Boolean(isFirstTime),
      Boolean(isEarlyPayment)
    );
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
    const fs = require('fs');
    const lawsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/laws_registry.json'), 'utf8'));
    res.json(lawsData.laws);
  } catch (err) {
    res.status(500).json({ error: '환경법 레지스트리 로드 실패' });
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
  console.log(`🚀 서버 주소: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
