/**
 * LLM 호출 최소화, 토큰 사용량 정밀 집계 및 비용 최적화 모듈
 */

const responseCache = new Map();
const CACHE_MAX_SIZE = 200;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24시간

// 누적 토큰 및 비용 통계
let stats = {
  totalRequests: 0,
  cacheHits: 0,
  localRuleFastPathHits: 0,
  llmCalls: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
  totalTokensUsed: 0,
  savedTokensEstimated: 0,
  estimatedCostUSD: 0,
  estimatedCostKRW: 0
};

// 정규화된 쿼리 키 생성
function getCacheKey(query, model) {
  return `${(model || 'default').toLowerCase()}_${query.toLowerCase().replace(/[^\w가-힣]/g, '')}`;
}

// 모델별 대략적 토큰 단가 (1M 토큰 당 USD)
function calculateTokenCost(model, promptTokens, completionTokens) {
  let inputRate = 0.15 / 1000000;  // 기본 gpt-4o-mini 수준
  let outputRate = 0.60 / 1000000;

  if (model.includes('gpt-5') || model.includes('o1') || model.includes('o3')) {
    inputRate = 2.50 / 1000000;
    outputRate = 10.00 / 1000000;
  } else if (model.includes('gpt-4o') && !model.includes('mini')) {
    inputRate = 2.50 / 1000000;
    outputRate = 10.00 / 1000000;
  }

  const costUSD = (promptTokens * inputRate) + (completionTokens * outputRate);
  const costKRW = costUSD * 1400; // 환율 약 1400원 기준

  return {
    costUSD,
    costKRW,
    costKRWFormatted: costKRW < 1 ? `${costKRW.toFixed(2)}원` : `${costKRW.toFixed(1)}원`
  };
}

// 캐시 조회
function getCachedResponse(query, model) {
  const key = getCacheKey(query, model);
  const cached = responseCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }

  stats.cacheHits++;
  stats.savedTokensEstimated += 1500;
  return {
    ...cached.data,
    cached: true,
    cache_hit_time: new Date(cached.timestamp).toLocaleTimeString('ko-KR'),
    token_usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      saved_tokens: 1500,
      cost_krw_str: "0원 (캐시 재사용 100% 절감)",
      is_cached: true
    }
  };
}

// 캐시 저장
function setCachedResponse(query, model, data) {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  const key = getCacheKey(query, model);
  responseCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function recordLLMUsage(model, promptTokens, completionTokens) {
  stats.totalRequests++;
  stats.llmCalls++;
  stats.totalPromptTokens += promptTokens || 0;
  stats.totalCompletionTokens += completionTokens || 0;
  const total = (promptTokens || 0) + (completionTokens || 0);
  stats.totalTokensUsed += total;

  const cost = calculateTokenCost(model, promptTokens || 0, completionTokens || 0);
  stats.estimatedCostUSD += cost.costUSD;
  stats.estimatedCostKRW += cost.costKRW;
}

function recordLocalHit() {
  stats.totalRequests++;
  stats.localRuleFastPathHits++;
  stats.savedTokensEstimated += 1500;
}

function getOptimizationStats() {
  const totalSaved = stats.cacheHits + stats.localRuleFastPathHits;
  const savingRate = stats.totalRequests > 0 ? Math.round((totalSaved / stats.totalRequests) * 100) : 0;
  return {
    ...stats,
    savingRatePct: savingRate,
    totalCostKRWStr: `${stats.estimatedCostKRW.toFixed(1)}원`,
    totalCostUSDStr: `$${stats.estimatedCostUSD.toFixed(4)}`
  };
}

module.exports = {
  getCachedResponse,
  setCachedResponse,
  recordLLMUsage,
  recordLocalHit,
  calculateTokenCost,
  getOptimizationStats
};
