document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Theme
  const tabButtons = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const toggleSwitch = themeToggleBtn.querySelector('.toggle-switch');
  const themeLabel = themeToggleBtn.querySelector('.theme-label');
  const btnExportReport = document.getElementById('btn-export-report');

  // OpenAI Modal & Key Elements
  const btnOpenApiModal = document.getElementById('btn-open-api-modal');
  const apiModal = document.getElementById('api-modal');
  const btnCloseApiModal = document.getElementById('btn-close-api-modal');
  const inputApiKey = document.getElementById('input-api-key');
  const selectModel = document.getElementById('select-model');
  const customModelGroup = document.getElementById('custom-model-group');
  const inputCustomModel = document.getElementById('input-custom-model');
  const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
  const btnTestKey = document.getElementById('btn-test-key');
  const btnSaveKey = document.getElementById('btn-save-key');
  const btnClearKey = document.getElementById('btn-clear-key');
  const modalTestStatus = document.getElementById('modal-test-status');
  const headerKeyDot = document.getElementById('header-key-dot');
  const headerKeyText = document.getElementById('header-key-text');
  const modelModeBadge = document.getElementById('model-mode-badge');
  const engineStatusText = document.getElementById('engine-status-text');
  const llmHintBanner = document.getElementById('llm-hint-banner');

  // Chat Elements
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const messagesContainer = document.getElementById('messages-container');
  const sideContextBody = document.getElementById('side-context-body');
  const quickChips = document.querySelectorAll('.chip');

  // Calculator Elements
  const calcSelect = document.getElementById('calc-violation-select');
  const btnRunCalc = document.getElementById('btn-run-calc');
  const calcResultBody = document.getElementById('calc-result-body');
  const calcStatusBadge = document.getElementById('calc-status-badge');

  // Statutes Elements
  const statuteSearchInput = document.getElementById('statute-search-input');
  const filterPills = document.querySelectorAll('.filter-pills .pill');
  const statutesContainer = document.getElementById('statutes-container');

  // Checklist Elements
  const checklistContainer = document.getElementById('checklist-container');
  const checklistPercent = document.getElementById('checklist-percent');
  const checklistBar = document.getElementById('checklist-bar');
  const btnResetChecklist = document.getElementById('btn-reset-checklist');

  let allStatutesData = null;
  let allViolationsList = [];
  let currentFilter = 'all';

  // API Key State
  let savedApiKey = localStorage.getItem('cca_openai_api_key') || '';
  let savedModel = localStorage.getItem('cca_openai_model') || 'gpt-5.5';

  function updateKeyStatusUI() {
    if (savedApiKey && savedApiKey.trim()) {
      headerKeyDot.classList.add('active');
      headerKeyText.textContent = `🟢 ${savedModel} RAG 활성`;
      modelModeBadge.textContent = `${savedModel} RAG`;
      modelModeBadge.style.color = '#818cf8';
      engineStatusText.textContent = 'OpenAI + 로컬 RAG 가동';
      if (llmHintBanner) {
        llmHintBanner.style.display = 'none';
      }
    } else {
      headerKeyDot.classList.remove('active');
      headerKeyText.textContent = '🔑 OpenAI API 연동';
      modelModeBadge.textContent = '로컬 룰 엔진';
      modelModeBadge.style.color = 'var(--text-secondary)';
      engineStatusText.textContent = '로컬 법령 지식베이스 가동';
      if (llmHintBanner) {
        llmHintBanner.style.display = 'block';
      }
    }
  }

  updateKeyStatusUI();

  // Model selection custom toggle
  selectModel.addEventListener('change', () => {
    if (selectModel.value === 'custom') {
      customModelGroup.style.display = 'block';
    } else {
      customModelGroup.style.display = 'none';
    }
  });

  // Modal Open/Close
  btnOpenApiModal.addEventListener('click', () => {
    inputApiKey.value = savedApiKey;
    
    // Check if savedModel is in options
    let found = false;
    for (const opt of selectModel.options) {
      if (opt.value === savedModel) {
        selectModel.value = savedModel;
        customModelGroup.style.display = 'none';
        found = true;
        break;
      }
    }
    if (!found && savedModel) {
      selectModel.value = 'custom';
      customModelGroup.style.display = 'block';
      inputCustomModel.value = savedModel;
    }

    modalTestStatus.style.display = 'none';
    apiModal.classList.add('active');
  });

  btnCloseApiModal.addEventListener('click', () => {
    apiModal.classList.remove('active');
  });

  apiModal.addEventListener('click', (e) => {
    if (e.target === apiModal) {
      apiModal.classList.remove('active');
    }
  });

  btnToggleKeyVisibility.addEventListener('click', () => {
    if (inputApiKey.type === 'password') {
      inputApiKey.type = 'text';
      btnToggleKeyVisibility.textContent = '숨김';
    } else {
      inputApiKey.type = 'password';
      btnToggleKeyVisibility.textContent = '보기';
    }
  });

  // Test Key
  btnTestKey.addEventListener('click', async () => {
    const key = inputApiKey.value.trim();
    if (!key) {
      modalTestStatus.className = 'test-status-box error';
      modalTestStatus.textContent = 'API 키를 입력해 주세요.';
      modalTestStatus.style.display = 'block';
      return;
    }

    modalTestStatus.className = 'test-status-box';
    modalTestStatus.style.background = 'rgba(99, 102, 241, 0.15)';
    modalTestStatus.style.color = '#c7d2fe';
    modalTestStatus.textContent = '⏳ OpenAI 서버와 연결 확인 중...';
    modalTestStatus.style.display = 'block';

    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();
      if (data.success) {
        modalTestStatus.className = 'test-status-box success';
        modalTestStatus.textContent = '✅ ' + data.message;
      } else {
        modalTestStatus.className = 'test-status-box error';
        modalTestStatus.textContent = '❌ ' + (data.error || '인증 실패');
      }
    } catch (err) {
      modalTestStatus.className = 'test-status-box error';
      modalTestStatus.textContent = '❌ 서버 통신 오류';
    }
  });

  // Save Key
  btnSaveKey.addEventListener('click', () => {
    const key = inputApiKey.value.trim();
    let model = selectModel.value;
    if (model === 'custom') {
      model = inputCustomModel.value.trim() || 'gpt-5.5';
    }

    savedApiKey = key;
    savedModel = model;

    localStorage.setItem('cca_openai_api_key', key);
    localStorage.setItem('cca_openai_model', model);

    updateKeyStatusUI();
    apiModal.classList.remove('active');
    alert(key ? `OpenAI (${model}) RAG 모드가 활성화되었습니다!` : '로컬 룰 엔진 모드로 전환되었습니다.');
  });

  // Clear Key
  btnClearKey.addEventListener('click', () => {
    if (confirm('저장된 API 키를 삭제하고 로컬 룰 엔진 모드로 전환하시겠습니까?')) {
      savedApiKey = '';
      localStorage.removeItem('cca_openai_api_key');
      inputApiKey.value = '';
      updateKeyStatusUI();
      apiModal.classList.remove('active');
    }
  });

  // Tab Titles Map
  const tabInfo = {
    hub: {
      title: '대한민국 6대 핵심 환경법 통합 포털',
      subtitle: '사업장 인허가, 화학안전, 대기, 수질, 폐기물 등 주요 환경규제를 통합 관리합니다.'
    },
    chat: {
      title: '화학물질관리법 AI 법률 상담',
      subtitle: '수입 전 확인명세서, 인허가, 정기검사, 과태료 및 벌칙 기준을 실시간 분석합니다.'
    },
    calculator: {
      title: '과태료 & 행정처분 시뮬레이터',
      subtitle: '화관법 위반 유형별 과태료 차수 산정 및 자진신고 감경액을 계산합니다.'
    },
    statutes: {
      title: '3단 법령 및 별표 실시간 뷰어',
      subtitle: '화학물질관리법 법률-시행령-시행규칙 및 과태료/처분 별표를 상호 조회합니다.'
    },
    checklist: {
      title: '화관법 실무 컴플라이언스 점검',
      subtitle: '수입 통관 전 및 상시 운영 시 필요한 핵심 법적 의무를 진단합니다.'
    }
  };

  // Global Law Switcher
  const globalLawSelect = document.getElementById('global-law-select');
  const headerLawPill = document.getElementById('header-law-pill');
  const headerLawTitle = document.getElementById('header-law-title');
  const currentLawBadge = document.getElementById('current-law-badge');
  const chatWelcomeBotName = document.getElementById('chat-welcome-bot-name');

  // Law Preview Modal Elements
  const lawPreviewModal = document.getElementById('law-preview-modal');
  const previewModalIcon = document.getElementById('preview-modal-icon');
  const previewModalTitle = document.getElementById('preview-modal-title');
  const previewModalStatus = document.getElementById('preview-modal-status');
  const previewModalDesc = document.getElementById('preview-modal-desc');
  const previewModalTopics = document.getElementById('preview-modal-topics');
  const btnCloseLawModal = document.getElementById('btn-close-law-modal');
  const btnCloseLawPreviewBtn = document.getElementById('btn-close-law-preview-btn');
  const btnPreviewSwitchCca = document.getElementById('btn-preview-switch-cca');

  let lawsCache = [];

  function openLawPreviewModal(law) {
    if (!law) return;
    previewModalIcon.textContent = law.icon || '🏛️';
    previewModalTitle.textContent = law.name_full || law.name_ko;
    previewModalStatus.textContent = law.status_label || '⚪ 서비스 준비 중';
    previewModalStatus.className = `law-status-tag ${law.status === 'active' ? 'active' : ''}`;
    previewModalDesc.textContent = law.description || '';
    
    if (law.key_topics && law.key_topics.length > 0) {
      previewModalTopics.innerHTML = law.key_topics.map(t => `<li>${t}</li>`).join('');
    } else {
      previewModalTopics.innerHTML = '<li>상세 규제 기준 준비 중입니다.</li>';
    }
    
    lawPreviewModal.classList.add('active');
  }

  function closeLawPreviewModal() {
    lawPreviewModal.classList.remove('active');
  }

  if (btnCloseLawModal) btnCloseLawModal.addEventListener('click', closeLawPreviewModal);
  if (btnCloseLawPreviewBtn) btnCloseLawPreviewBtn.addEventListener('click', closeLawPreviewModal);
  if (btnPreviewSwitchCca) {
    btnPreviewSwitchCca.addEventListener('click', () => {
      globalLawSelect.value = 'cca';
      applyLawSelection('cca');
      closeLawPreviewModal();
    });
  }

  let currentActiveLaw = 'cca';

  // K-REACH vs CCA Quick Chips Data
  const lawQuickChips = {
    cca: [
      { text: "🚨 확인명세서 누락 과태료", prompt: "수입제품 확인명세서 1건 제출을 누락했는데 관련된 법기준과 처벌 기준이 어떻게 되나요?" },
      { text: "🏗️ 10톤 탱크 방류벽·세안기 설치기준", prompt: "수산화나트륨 10톤 저장탱크를 옥외에 설치하려고해. 준수해야하는 방류벽이나 세안시설, 감지시설 등 법적 시설 기준 알려줘" },
      { text: "🔍 정기검사 주기 (2025 개정)", prompt: "유해화학물질 취급시설 정기검사 기준과 주기 알려줘" },
      { text: "🔒 보관장소 잠금장치 미설치 처벌", prompt: "사고대비물질 보관장소 잠금장치 안했을때 처벌조항 알려줘" },
      { text: "🚚 1톤 트럭 소량운반 기준", prompt: "1톤 트럭으로 질산 500kg 이송 시 운반계획서 제출해야 해?" },
      { text: "⛔ 산-알칼리-인화성 혼적금지", prompt: "보관창고에서 황산이랑 가성소다, 톨루엔을 같은 칸에 같이 보관해도 돼?" }
    ],
    kreach: [
      { text: "📅 기존화학물질 톤수별 유예기간", prompt: "연간 1톤 이상 기존화학물질 톤수별 등록 유예기간과 기한을 넘겼을 때 처벌 기준이 어떻게 되나요?" },
      { text: "🧪 신규물질 100kg 이상 등록 vs 미만 신고", prompt: "신규화학물질을 수입하려는데 100kg 이상 등록과 100kg 미만 신고의 차이점 및 미이행 시 처벌 알려줘" },
      { text: "🔬 R&D / 시약 등록면제확인 절차", prompt: "연구개발(R&D)용 화학물질 또는 시약 수입 시 등록면제확인 신청 방법 및 절차 알려줘" },
      { text: "🌐 해외 본사 CBI 국외대리인(OR)", prompt: "해외 제조사가 성분을 안 알려줄 때 국외대리인(OR) 선임 및 수입자 통보 절차 알려줘" },
      { text: "📜 양도 시 정보제공(제29조) 과태료", prompt: "화학물질 양도 시 등록번호 및 안전정보 전달(제29조) 의무 위반 시 과태료 알려줘" },
      { text: "📂 실적 서류 5년 기록·보존(제43조)", prompt: "화평법상 화학물질 제조·수입 실적 서류를 몇 년간 보존해야 하고 위반 시 과태료는?" }
    ]
  };

  function updateQuickChips(lawId) {
    const chipsContainer = document.querySelector('.chips-list');
    if (!chipsContainer) return;
    const list = lawQuickChips[lawId] || lawQuickChips.cca;
    chipsContainer.innerHTML = list.map(c => `
      <button class="chip" data-prompt="${c.prompt}">
        ${c.text}
      </button>
    `).join('');

    chipsContainer.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chatInput.value = chip.dataset.prompt;
        chatForm.dispatchEvent(new Event('submit'));
      });
    });
  }

  function applyLawSelection(lawId) {
    const selectedLaw = lawsCache.find(l => l.id === lawId);
    if (!selectedLaw) return;

    if (selectedLaw.status === 'active') {
      currentActiveLaw = lawId;
      if (globalLawSelect) globalLawSelect.value = lawId;
      headerLawTitle.textContent = `🟢 ${selectedLaw.name_ko} (${selectedLaw.code}) 모드`;
      currentLawBadge.textContent = `${selectedLaw.code} 전문 모드`;
      chatWelcomeBotName.textContent = `ECO-COMPLIANCE AI (${selectedLaw.name_ko} 모드)`;
      
      updateQuickChips(lawId);
      loadViolationsList();
      loadStatutesData();
      loadChecklistData();
      switchTab('chat');
    } else {
      openLawPreviewModal(selectedLaw);
    }
  }

  if (globalLawSelect) {
    globalLawSelect.addEventListener('change', (e) => {
      applyLawSelection(e.target.value);
    });
  }

  // Switch Tab
  function switchTab(tabId) {
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    tabPanels.forEach(panel => {
      if (panel.id === `tab-${tabId}`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });

    if (tabInfo[tabId]) {
      pageTitle.textContent = tabInfo[tabId].title;
      pageSubtitle.textContent = tabInfo[tabId].subtitle;
    }
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Theme Toggle
  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    toggleSwitch.classList.toggle('active', !isLight);
    themeLabel.textContent = isLight ? '☀️ 라이트 모드' : '🌙 다크 모드';
  });

  // Export Report
  btnExportReport.addEventListener('click', () => {
    window.print();
  });

  // Quick Chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chatInput.value = chip.dataset.prompt;
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  // Markdown parser helper for chat response
  function formatMarkdown(md) {
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '<br>');
    return html;
  }

  // Add message to chat UI
  function addMessage(sender, text, data = null) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}-row`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${sender}-avatar`;
    avatar.textContent = sender === 'user' ? '👤' : '⚖️';

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${sender}-bubble`;

    if (sender === 'bot') {
      const isLLM = data && (data.match_type === 'openai_rag' || data.model_used);
      const header = document.createElement('div');
      header.className = 'bot-header';
      header.innerHTML = `
        <span class="bot-name">
          화관법 컴플라이언스 AI 에이전트
          ${isLLM ? `<span class="llm-badge">🤖 ${data.model_used || savedModel} RAG</span>` : `<span class="llm-badge" style="background:rgba(16,185,129,0.15);color:#10b981;border-color:rgba(16,185,129,0.3)">⚡ 로컬 법률 RAG</span>`}
        </span>
        <span class="bot-time">${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
      `;
      bubble.appendChild(header);

      const content = document.createElement('div');
      content.className = 'bot-content';
      content.innerHTML = formatMarkdown(text);
      bubble.appendChild(content);

      // Add Token & Cost Info Bar
      const tokenBar = document.createElement('div');
      tokenBar.className = 'token-usage-bar';
      if (data && data.token_usage) {
        const u = data.token_usage;
        if (u.is_cached) {
          tokenBar.innerHTML = `
            <span class="token-pill cached">⚡ 인메모리 캐시 재사용</span>
            <span class="cost-pill free">💰 0 토큰 (${u.saved_tokens}토큰 100% 절감 / 0원)</span>
          `;
        } else if (u.total_tokens > 0) {
          tokenBar.innerHTML = `
            <span class="token-pill">⚡ ${u.total_tokens.toLocaleString()} 토큰 <small>(입력: ${u.prompt_tokens} / 출력: ${u.completion_tokens})</small></span>
            <span class="cost-pill">💰 비용: ${u.cost_krw_str}</span>
          `;
        } else {
          tokenBar.innerHTML = `
            <span class="token-pill local">🌿 로컬 룰 엔진</span>
            <span class="cost-pill free">💰 0 토큰 (비용 0원)</span>
          `;
        }
      } else {
        tokenBar.innerHTML = `
          <span class="token-pill local">🌿 로컬 룰 엔진</span>
          <span class="cost-pill free">💰 0 토큰 (비용 0원)</span>
        `;
      }
      bubble.appendChild(tokenBar);

      // Add related statute tags
      if (data && data.related_articles && data.related_articles.length > 0) {
        const tagsBar = document.createElement('div');
        tagsBar.className = 'tags-bar';
        data.related_articles.forEach(art => {
          const tag = document.createElement('span');
          tag.className = 'statute-tag';
          tag.textContent = `📖 ${art}`;
          tag.addEventListener('click', () => {
            switchTab('statutes');
            statuteSearchInput.value = art.split(' ')[0] || art;
            filterStatutes();
          });
          tagsBar.appendChild(tag);
        });
        bubble.appendChild(tagsBar);
      }
    } else {
      bubble.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(bubble);
    messagesContainer.appendChild(row);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Update Side Context Panel
  function updateSideContext(data) {
    if (!data) return;

    if (data.matrix_item) {
      const item = data.matrix_item;
      sideContextBody.innerHTML = `
        <div class="diagnosis-box">
          <div class="diag-title">🚨 법률 위반/규정 진단</div>
          <div class="diag-item">
            <span>대상 사안:</span>
            <strong>${item.title}</strong>
          </div>
          <div class="diag-item">
            <span>법적 근거:</span>
            <span>${item.statute_basis}</span>
          </div>
          <div class="diag-item">
            <span>1차 과태료:</span>
            <span class="diag-val">${item.administrative_fine ? item.administrative_fine.first_offense_str : '해당 없음'}</span>
          </div>
          <div class="diag-item">
            <span>1차 행정처분:</span>
            <span class="diag-val">${item.administrative_disposition ? item.administrative_disposition.first_offense : '해당 없음'}</span>
          </div>
        </div>
        <button class="btn btn-primary btn-sm btn-block" id="btn-quick-calc">
          🧮 과태료 계산기로 바로 이동
        </button>
      `;

      document.getElementById('btn-quick-calc')?.addEventListener('click', () => {
        switchTab('calculator');
        calcSelect.value = item.id;
        runPenaltyCalculation();
      });
    } else {
      sideContextBody.innerHTML = `
        <div class="diagnosis-box">
          <div class="diag-title">📄 관련 조항 안내</div>
          <div class="diag-item">
            <span>참조 법령:</span>
            <strong>화학물질관리법</strong>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px;">
            상세 위반 사항에 대해 과태료 계산기에서 시뮬레이션할 수 있습니다.
          </p>
        </div>
      `;
    }
  }

  // Chat Submit Handler
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;

    // Add user message
    addMessage('user', query);
    chatInput.value = '';

    // Typing loading bubble
    const loadingRow = document.createElement('div');
    loadingRow.className = 'message-row bot-row loading-row';
    const isLLM = !!(savedApiKey && savedApiKey.trim());
    loadingRow.innerHTML = `
      <div class="avatar bot-avatar">⚖️</div>
      <div class="message-bubble bot-bubble">
        <div class="bot-header">
          <span class="bot-name">${isLLM ? `OpenAI (${savedModel}) RAG 심층 법률 추론 중...` : '로컬 법률 지식베이스 검색 중...'}</span>
        </div>
        <div class="bot-content" style="color: var(--accent-cyan);">
          ${isLLM 
            ? `⏳ 로컬 법률·시행령·시행규칙·[별표]를 검색하여 ${savedModel} 모델이 법리를 분석하고 있습니다...` 
            : '⏳ 화학물질관리법 법률·시행령·시행규칙·[별표] 데이터를 분석하고 있습니다...'}
        </div>
      </div>
    `;
    messagesContainer.appendChild(loadingRow);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const response = await fetch('/api/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query,
          apiKey: savedApiKey,
          model: savedModel,
          law: currentActiveLaw
        })
      });

      const data = await response.json();
      loadingRow.remove();

      if (data.error) {
        addMessage('bot', `⚠️ 오류가 발생했습니다: ${data.error}`);
      } else {
        addMessage('bot', data.answer, data);
        updateSideContext(data);
      }
    } catch (err) {
      loadingRow.remove();
      addMessage('bot', `⚠️ 서버 통신 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.`);
    }
  });

  // Enter to submit
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Load Violations for Calculator
  async function loadViolationsList() {
    try {
      const endpoint = currentActiveLaw === 'kreach' ? '/api/kreach/violations-list' : '/api/violations-list';
      const res = await fetch(endpoint);
      allViolationsList = await res.json();
      calcSelect.innerHTML = '<option value="">-- 위반 유형을 선택하세요 --</option>';
      allViolationsList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.textContent = `[${v.category}] ${v.title} (${v.statute_basis})`;
        calcSelect.appendChild(opt);
      });
    } catch (err) {
      console.error('Failed to load violations:', err);
    }
  }

  // Run Penalty Calculation
  async function runPenaltyCalculation() {
    const violationId = calcSelect.value;
    if (!violationId) {
      alert('위반 항목을 선택해 주세요.');
      return;
    }

    const offenseLevel = document.querySelector('input[name="offense-level"]:checked').value;
    const isVoluntary = document.getElementById('chk-voluntary').checked;
    const isFirstTime = document.getElementById('chk-first-time').checked;
    const isEarlyPayment = document.getElementById('chk-early-payment').checked;

    try {
      const res = await fetch('/api/calculate-penalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          violationId,
          offenseLevel,
          isVoluntary,
          isFirstTime,
          isEarlyPayment
        })
      });

      const result = await res.json();
      if (result.error) {
        alert(result.error);
        return;
      }

      calcStatusBadge.textContent = '산정 완료';
      calcStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      calcStatusBadge.style.color = '#10b981';

      calcResultBody.innerHTML = `
        <div class="fine-display-box">
          <div class="fine-label">최종 예상 부과 과태료</div>
          <div class="fine-amount">${result.calculated_fine_str}</div>
          <div class="base-fine-note">기준 과태료: ${result.base_fine_str} (${offenseLevel}차 위반 기준)</div>
        </div>

        <div class="reduction-badge-list">
          <div style="font-size: 0.82rem; font-weight: 700; color: #a5b4fc; margin-bottom: 4px;">적용된 감경 항목:</div>
          ${result.applied_reductions.length > 0 
            ? result.applied_reductions.map(r => `<div class="reduction-badge">✓ ${r}</div>`).join('')
            : '<div style="font-size: 0.78rem; color: var(--text-muted);">적용된 감경 사유 없음</div>'}
        </div>

        <div class="diagnosis-box" style="margin-top: 16px;">
          <div class="diag-title">⚖️ 행정처분 및 벌칙 기준</div>
          <div class="diag-item">
            <span>예상 행정처분:</span>
            <span class="diag-val" style="color: #38bdf8;">${result.disposition || '해당 없음'}</span>
          </div>
          <div class="diag-item">
            <span>형사 벌칙 여부:</span>
            <span>${result.criminal_penalty}</span>
          </div>
          <div class="diag-item">
            <span>관련 법조문:</span>
            <span>${result.statute_basis}</span>
          </div>
        </div>

        <div style="margin-top: 16px;">
          <div style="font-size: 0.85rem; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">🛡️ 권장 대응 행동 요령:</div>
          <ol style="margin-left: 20px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
            ${result.practical_actions ? result.practical_actions.map(a => `<li>${a}</li>`).join('') : ''}
          </ol>
        </div>
      `;
    } catch (err) {
      alert('과태료 산정 중 오류가 발생했습니다.');
    }
  }

  btnRunCalc.addEventListener('click', runPenaltyCalculation);

  // Load Statutes Viewer Data
  async function loadStatutesData() {
    try {
      const endpoint = currentActiveLaw === 'kreach' ? '/api/kreach/statutes' : '/api/statutes';
      const res = await fetch(endpoint);
      allStatutesData = await res.json();
      renderStatutes();
    } catch (err) {
      statutesContainer.innerHTML = '<div class="empty-state">법령 데이터를 불러오지 못했습니다.</div>';
    }
  }

  function renderStatutes() {
    if (!allStatutesData) return;
    const query = statuteSearchInput.value.toLowerCase().trim();
    let cardsHtml = '';
    const lawLabel = currentActiveLaw === 'kreach' ? '화평법' : '화관법';

    // Act
    if (currentFilter === 'all' || currentFilter === 'act') {
      if (allStatutesData.act && allStatutesData.act.articles) {
        allStatutesData.act.articles.forEach(art => {
          const fullText = `${art.article_no} ${art.title} ${art.content} ${art.category || ''}`.toLowerCase();
          if (!query || fullText.includes(query)) {
            cardsHtml += `
              <div class="statute-card">
                <div class="statute-card-header">
                  <div class="statute-title-box">
                    <span class="article-badge">${art.article_no}</span>
                    <span class="statute-name">${art.title}</span>
                  </div>
                  <span class="tier-badge">${lawLabel} (법률)</span>
                </div>
                <div class="statute-body">${art.content}</div>
                ${art.related_penalties ? `<div class="tags-bar">${art.related_penalties.map(p => `<span class="statute-tag">🚨 ${p}</span>`).join('')}</div>` : ''}
              </div>
            `;
          }
        });
      }
    }

    // Decree
    if (currentFilter === 'all' || currentFilter === 'decree') {
      allStatutesData.decree.articles.forEach(art => {
        const fullText = `${art.article_no} ${art.title} ${art.content}`.toLowerCase();
        if (!query || fullText.includes(query)) {
          cardsHtml += `
            <div class="statute-card">
              <div class="statute-card-header">
                <div class="statute-title-box">
                  <span class="article-badge">${art.article_no}</span>
                  <span class="statute-name">${art.title}</span>
                </div>
                <span class="tier-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.3);">시행령</span>
              </div>
              <div class="statute-body">${art.content}</div>
            </div>
          `;
        }
      });

      // Decree Table 2 (Penalties)
      if (allStatutesData.decree.table_penalties) {
        const t = allStatutesData.decree.table_penalties;
        t.individual_penalties.forEach(p => {
          const fullText = `${t.title} ${p.violation_desc} ${p.related_act}`.toLowerCase();
          if (!query || fullText.includes(query)) {
            cardsHtml += `
              <div class="statute-card" style="border-color: rgba(239, 68, 68, 0.3);">
                <div class="statute-card-header">
                  <div class="statute-title-box">
                    <span class="article-badge" style="background: #ef4444;">[별표 2 ${p.item_code}목]</span>
                    <span class="statute-name">과태료 부과기준</span>
                  </div>
                  <span class="tier-badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border-color: rgba(239, 68, 68, 0.3);">시행령 [별표 2]</span>
                </div>
                <div class="statute-body">
                  <strong>위반 행위:</strong> ${p.violation_desc}<br>
                  <strong>근거 조항:</strong> ${p.related_act}<br>
                  <strong>과태료 금액:</strong> 1차: <span style="color:#f87171;font-weight:700;">${p.fine_1st_str}</span> / 2차: <span style="color:#f87171;font-weight:700;">${p.fine_2nd_str}</span> / 3차: <span style="color:#f87171;font-weight:700;">${p.fine_3rd_str}</span><br>
                  <em style="color:var(--text-muted);">${p.remarks}</em>
                </div>
              </div>
            `;
          }
        });
      }
    }

    // Rule
    if (currentFilter === 'all' || currentFilter === 'rule') {
      allStatutesData.rule.articles.forEach(art => {
        const fullText = `${art.article_no} ${art.title} ${art.content}`.toLowerCase();
        if (!query || fullText.includes(query)) {
          cardsHtml += `
            <div class="statute-card">
              <div class="statute-card-header">
                <div class="statute-title-box">
                  <span class="article-badge" style="background: #8b5cf6;">${art.article_no}</span>
                  <span class="statute-name">${art.title}</span>
                </div>
                <span class="tier-badge" style="background: rgba(139, 92, 246, 0.15); color: #a78bfa; border-color: rgba(139, 92, 246, 0.3);">시행규칙</span>
              </div>
              <div class="statute-body">${art.content}</div>
            </div>
          `;
        }
      });
    }

    // Notices
    if (currentFilter === 'all' || currentFilter === 'notices') {
      allStatutesData.notices.key_clauses.forEach(art => {
        const fullText = `${art.article_no} ${art.title} ${art.content}`.toLowerCase();
        if (!query || fullText.includes(query)) {
          cardsHtml += `
            <div class="statute-card">
              <div class="statute-card-header">
                <div class="statute-title-box">
                  <span class="article-badge" style="background: #f59e0b;">${art.article_no}</span>
                  <span class="statute-name">${art.title}</span>
                </div>
                <span class="tier-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3);">환경부 고시</span>
              </div>
              <div class="statute-body">${art.content}</div>
            </div>
          `;
        }
      });
    }

    statutesContainer.innerHTML = cardsHtml || '<div class="empty-state">검색 조건과 일치하는 법령 조항이 없습니다.</div>';
  }

  function filterStatutes() {
    renderStatutes();
  }

  statuteSearchInput.addEventListener('input', filterStatutes);

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.dataset.filter;
      filterStatutes();
    });
  });

  // Load Checklist Data
  async function loadChecklistData() {
    try {
      const endpoint = currentActiveLaw === 'kreach' ? '/api/kreach/checklist' : '/api/checklist';
      const res = await fetch(endpoint);
      const stages = await res.json();
      renderChecklist(stages);
    } catch (err) {
      checklistContainer.innerHTML = '<div class="empty-state">체크리스트를 불러오지 못했습니다.</div>';
    }
  }

  function renderChecklist(stages) {
    let savedState = {};
    try {
      savedState = JSON.parse(localStorage.getItem('cca_checklist_state') || '{}');
    } catch (e) {}

    let totalItems = 0;
    let completedItems = 0;
    let stagesHtml = '';

    stages.forEach(stage => {
      stagesHtml += `
        <div class="stage-section">
          <div class="stage-title">📍 ${stage.stage}</div>
          <div class="stage-items-list">
      `;

      stage.items.forEach(item => {
        totalItems++;
        const isDone = !!savedState[item.id];
        if (isDone) completedItems++;

        stagesHtml += `
          <div class="check-item-card ${isDone ? 'completed' : ''}" data-item-id="${item.id}">
            <div class="check-box-icon">${isDone ? '✓' : ''}</div>
            <div class="check-item-info">
              <div class="check-item-title">${item.task}</div>
              <div class="check-item-meta">
                <span>📖 근거: ${item.legal_ref}</span>
                <span>⏰ 기한: ${item.deadline}</span>
                <span>🏛️ 소관: ${item.agency}</span>
                <span class="risk-tag">⚠️ ${item.risk}</span>
              </div>
            </div>
          </div>
        `;
      });

      stagesHtml += `
          </div>
        </div>
      `;
    });

    checklistContainer.innerHTML = stagesHtml;

    // Update Progress
    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    checklistPercent.textContent = `${pct}% (${completedItems}/${totalItems} 완료)`;
    checklistBar.style.width = `${pct}%`;

    // Click handler for items
    document.querySelectorAll('.check-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.itemId;
        const willBeDone = !card.classList.contains('completed');
        savedState[id] = willBeDone;
        localStorage.setItem('cca_checklist_state', JSON.stringify(savedState));
        loadChecklistData();
      });
    });
  }

  btnResetChecklist.addEventListener('click', () => {
    if (confirm('체크리스트 진행 상태를 모두 초기화하시겠습니까?')) {
      localStorage.removeItem('cca_checklist_state');
      loadChecklistData();
    }
  });

  // Load 6 Core Environmental Laws Hub
  async function loadLawsHubData() {
    const gridContainer = document.getElementById('laws-grid-container');
    if (!gridContainer) return;

    try {
      const res = await fetch('/api/laws');
      const laws = await res.json();
      lawsCache = laws;

      // Dynamically sync dropdown options
      if (globalLawSelect) {
        const currentVal = globalLawSelect.value || 'cca';
        globalLawSelect.innerHTML = laws.map(l => {
          const isAct = l.status === 'active';
          return `<option value="${l.id}">${l.icon} ${l.name_ko} (${l.code})${isAct ? '' : ' [준비중]'}</option>`;
        }).join('');
        globalLawSelect.value = currentVal;
      }

      gridContainer.innerHTML = laws.map(law => {
        const isActive = law.status === 'active';
        return `
          <div class="law-card ${isActive ? 'active-law' : ''}" data-law-id="${law.id}">
            <div class="law-card-top">
              <div class="law-icon-box">${law.icon}</div>
              <span class="law-status-badge ${isActive ? 'active' : 'coming'}">${law.status_label}</span>
            </div>
            <div class="law-card-name">${law.name_ko} <small style="font-size:0.78rem;color:var(--text-muted);font-weight:normal">(${law.code})</small></div>
            <p class="law-card-desc">${law.description}</p>
            
            <div class="law-topics-title">📌 주요 규제 및 관리 영역</div>
            <ul class="law-topics-list">
              ${law.key_topics.slice(0, 3).map(t => `<li>${t}</li>`).join('')}
            </ul>

            <button class="law-card-btn ${isActive ? 'active' : 'preview'}" data-law-id="${law.id}">
              ${isActive ? '🟢 AI 실무 상담 및 계산기 실행' : '🔍 규제 영역 및 지원 계획 보기'}
            </button>
          </div>
        `;
      }).join('');

      // Add click events to buttons
      gridContainer.querySelectorAll('.law-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const lawId = btn.dataset.lawId;
          const law = lawsCache.find(l => l.id === lawId);
          if (law && law.status === 'active') {
            if (globalLawSelect) globalLawSelect.value = lawId;
            applyLawSelection(lawId);
          } else if (law) {
            openLawPreviewModal(law);
          }
        });
      });

    } catch (err) {
      gridContainer.innerHTML = `<div class="error-msg">환경법 데이터를 불러오지 못했습니다. (${err.message})</div>`;
    }
  }

  // Initial Data Loads
  loadLawsHubData();
  loadViolationsList();
  loadStatutesData();
  loadChecklistData();

  // ========================================================
  // 📊 Admin Access & IP Logs Module
  // ========================================================
  const btnOpenLogsModal = document.getElementById('btn-open-logs-modal');
  const logsModal = document.getElementById('logs-modal');
  const btnCloseLogsModal = document.getElementById('btn-close-logs-modal');
  const logsTableBody = document.getElementById('logs-table-body');
  const statTotalQueries = document.getElementById('stat-total-queries');
  const statUniqueIps = document.getElementById('stat-unique-ips');
  const statTotalTokens = document.getElementById('stat-total-tokens');
  const logsSearchInput = document.getElementById('logs-search-input');
  const btnRefreshLogs = document.getElementById('btn-refresh-logs');
  const btnExportLogsCsv = document.getElementById('btn-export-logs-csv');
  const btnClearLogs = document.getElementById('btn-clear-logs');

  let rawLogsData = [];

  function escapeLogHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function fetchAndRenderLogs() {
    if (!logsTableBody) return;
    try {
      logsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:30px;">로그 불러오는 중...</td></tr>';
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      rawLogsData = data.logs || [];
      
      if (statTotalQueries) statTotalQueries.textContent = `${data.total_count || 0}건`;
      if (statUniqueIps) statUniqueIps.textContent = `${data.unique_ips || 0}개`;
      if (statTotalTokens) statTotalTokens.textContent = `${(data.total_tokens || 0).toLocaleString()} tkn`;
      
      renderLogsTable(rawLogsData);
    } catch (err) {
      logsTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444; padding:30px;">로그 로드 실패: ${err.message}</td></tr>`;
    }
  }

  function renderLogsTable(logs) {
    if (!logsTableBody) return;
    const filter = (logsSearchInput && logsSearchInput.value ? logsSearchInput.value : '').toLowerCase().trim();
    const filtered = logs.filter(l => {
      if (!filter) return true;
      return (l.ip && l.ip.toLowerCase().includes(filter)) ||
             (l.query && l.query.toLowerCase().includes(filter)) ||
             (l.law && l.law.toLowerCase().includes(filter)) ||
             (l.engine && l.engine.toLowerCase().includes(filter));
    });

    if (filtered.length === 0) {
      logsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:30px;">기록된 접속 및 질문 내역이 없습니다.</td></tr>';
      return;
    }

    logsTableBody.innerHTML = filtered.map(item => `
      <tr>
        <td style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap;">${item.kst_time || item.timestamp || '-'}</td>
        <td><span class="ip-badge">${escapeLogHtml(item.ip || 'Unknown')}</span></td>
        <td><span class="law-tag-mini ${item.law === '화평법' ? 'kreach' : 'cca'}">${item.law || '화관법'}</span></td>
        <td style="max-width:320px; word-break:break-all; font-weight:500;">${escapeLogHtml(item.query || '')}</td>
        <td style="font-size:0.75rem; color:#a5b4fc; white-space:nowrap;">${escapeLogHtml(item.engine || '로컬엔진')}</td>
        <td style="font-size:0.75rem; color:#fbbf24; white-space:nowrap; font-weight:700;">${item.cost_krw || '0원'}</td>
      </tr>
    `).join('');
  }

  if (btnOpenLogsModal && logsModal) {
    btnOpenLogsModal.addEventListener('click', () => {
      logsModal.classList.add('active');
      fetchAndRenderLogs();
    });
  }

  if (btnCloseLogsModal && logsModal) {
    btnCloseLogsModal.addEventListener('click', () => {
      logsModal.classList.remove('active');
    });
  }

  if (logsModal) {
    logsModal.addEventListener('click', (e) => {
      if (e.target === logsModal) logsModal.classList.remove('active');
    });
  }

  if (logsSearchInput) {
    logsSearchInput.addEventListener('input', () => renderLogsTable(rawLogsData));
  }

  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', fetchAndRenderLogs);
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      if (confirm('저장된 모든 접속 로그를 삭제하시겠습니까?')) {
        await fetch('/api/admin/logs', { method: 'DELETE' });
        fetchAndRenderLogs();
      }
    });
  }

  if (btnExportLogsCsv) {
    btnExportLogsCsv.addEventListener('click', () => {
      if (!rawLogsData.length) {
        alert('내보낼 로그 데이터가 없습니다.');
        return;
      }
      let csv = '\uFEFF일시(KST),접속자IP,적용법령,질문내용,사용엔진,소모토큰,소모비용\n';
      rawLogsData.forEach(l => {
        const q = (l.query || '').replace(/"/g, '""');
        csv += `"${l.kst_time || ''}","${l.ip || ''}","${l.law || ''}","${q}","${l.engine || ''}","${l.tokens || 0}","${l.cost_krw || ''}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `환경법규_에이전트_접속로그_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });
  }
});
