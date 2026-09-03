/* ==========================================================================
   Mindmap Module - Open Source Vis.js Network Vocabulary Mind Map Engine
   ========================================================================== */

let networkInstance = null;

const MINDMAP_CLUSTERS = {
  conj_prep: {
    title: '🔗 조건·이유·양보 접속사 vs 전치사',
    centerNode: { id: 'root', label: '접속사 · 전치사 · 접속부사', color: '#6366f1', size: 30 },
    groups: [
      {
        id: 'g_reason',
        label: '이유 · 원인 (Reason)',
        color: '#3b82f6',
        words: ['because', 'because of', 'due to', 'owing to', 'since', 'as']
      },
      {
        id: 'g_concession',
        label: '양보 · 대조 (Concession)',
        color: '#a855f7',
        words: ['although', 'even though', 'despite', 'in spite of', 'however', 'nevertheless', 'whereas', 'while']
      },
      {
        id: 'g_condition',
        label: '조건 (Condition)',
        color: '#10b981',
        words: ['if', 'unless', 'provided that', 'providing that', 'as long as', 'in case']
      },
      {
        id: 'g_addition',
        label: '부교 · 첨가 (Addition)',
        color: '#f59e0b',
        words: ['in addition to', 'besides', 'furthermore', 'moreover']
      }
    ]
  },
  business: {
    title: '💼 비즈니스 & 마케팅 필수 어휘',
    centerNode: { id: 'root', label: '비즈니스 핵심 어휘', color: '#8b5cf6', size: 30 },
    groups: [
      {
        id: 'g_price',
        label: '가격 · 자격',
        color: '#06b6d4',
        words: ['affordable', 'eligible', 'comparable', 'equivalent']
      },
      {
        id: 'g_relation',
        label: '업무 · 책임 · 호환',
        color: '#3b82f6',
        words: ['responsible', 'compatible', 'associated', 'equipped', 'consistent']
      },
      {
        id: 'g_state',
        label: '상태 · 가능성',
        color: '#2ed573',
        words: ['available', 'essential', 'vital', 'optimistic', 'responsive']
      }
    ]
  },
  quantity: {
    title: '📊 수량 & 정도 유의어 세트',
    centerNode: { id: 'root', label: '수량 · 정도 유의어', color: '#ec4899', size: 30 },
    groups: [
      {
        id: 'g_great',
        label: '상당한 · 현저한',
        color: '#ff4757',
        words: ['substantial', 'considerable', 'significant', 'drastic', 'prominent']
      },
      {
        id: 'g_time',
        label: '시간 · 순서 수식어',
        color: '#ffa502',
        words: ['subsequent', 'prior', 'preceding', 'convenient']
      }
    ]
  },
  traps: {
    title: '⚠️ 다품사 출제 함정 어휘',
    centerNode: { id: 'root', label: '다품사 함정 어휘', color: '#ff4757', size: 30 },
    groups: [
      {
        id: 'g_time_prep',
        label: '시간 전치사/접속사 겸용',
        color: '#a855f7',
        words: ['before', 'after', 'since', 'until']
      },
      {
        id: 'g_multi_pos',
        label: '자주 나오는 다품사 함정',
        color: '#3b82f6',
        words: ['as', 'while', 'like', 'besides', 'subject']
      }
    ]
  }
};

function initMindmap() {
  const container = document.getElementById('mindmap-container');
  const topicSelect = document.getElementById('mindmap-topic-select');
  const fitBtn = document.getElementById('mindmap-fit-btn');

  if (!container) return;

  if (topicSelect) {
    topicSelect.addEventListener('change', (e) => {
      renderMindmap(e.target.value);
    });
  }

  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      if (networkInstance) {
        networkInstance.fit({ animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
      }
    });
  }

  renderMindmap('conj_prep');
}

function renderMindmap(clusterKey) {
  const container = document.getElementById('mindmap-container');
  if (!container || typeof vis === 'undefined') return;

  const cluster = MINDMAP_CLUSTERS[clusterKey] || MINDMAP_CLUSTERS['conj_prep'];
  const nodes = [];
  const edges = [];

  // Root Center Node
  nodes.push({
    id: cluster.centerNode.id,
    label: cluster.centerNode.label,
    shape: 'box',
    margin: 14,
    color: {
      background: cluster.centerNode.color,
      border: '#ffffff',
      highlight: { background: '#818cf8', border: '#ffffff' }
    },
    font: { color: '#ffffff', size: 18, face: 'Outfit', multi: true, bold: true },
    shadow: { enabled: true, color: 'rgba(99, 102, 241, 0.6)', size: 15 }
  });

  // Groups and Words
  cluster.groups.forEach((grp) => {
    nodes.push({
      id: grp.id,
      label: grp.label,
      shape: 'ellipse',
      color: {
        background: grp.color,
        border: 'rgba(255, 255, 255, 0.4)',
        highlight: { background: '#38bdf8', border: '#ffffff' }
      },
      font: { color: '#ffffff', size: 14, face: 'Inter', bold: true }
    });

    edges.push({
      from: cluster.centerNode.id,
      to: grp.id,
      color: { color: grp.color, highlight: '#ffffff' },
      width: 3,
      length: 140
    });

    grp.words.forEach((wStr) => {
      // Find matching word object in state.allWords
      const matched = state.allWords.find(w => w.word.toLowerCase() === wStr.toLowerCase());
      const wordId = matched ? matched.id : `w_${wStr}`;
      const posTag = matched ? matched.pos : '기타';
      const meaning = matched ? matched.meaning : '';

      nodes.push({
        id: wordId,
        wordText: wStr,
        label: `${wStr}\n(${meaning || posTag})`,
        shape: 'box',
        margin: 10,
        color: {
          background: 'rgba(22, 30, 46, 0.9)',
          border: grp.color,
          highlight: { background: 'rgba(99, 102, 241, 0.4)', border: '#ffffff' }
        },
        font: { color: '#f8fafc', size: 13, face: 'Inter' },
        shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.4)', size: 8 }
      });

      edges.push({
        from: grp.id,
        to: wordId,
        color: { color: 'rgba(255, 255, 255, 0.2)', highlight: grp.color },
        width: 1.5,
        length: 110,
        dashes: true
      });
    });
  });

  const data = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges)
  };

  const options = {
    physics: {
      barnesHut: {
        gravitationalConstant: -3500,
        centralGravity: 0.3,
        springLength: 120,
        springConstant: 0.04
      },
      maxVelocity: 50,
      solver: 'barnesHut',
      timestep: 0.5,
      stabilization: { iterations: 150 }
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      zoomView: true,
      dragView: true
    }
  };

  if (networkInstance) {
    networkInstance.destroy();
  }

  networkInstance = new vis.Network(container, data, options);

  // Click Event Handler: TTS Audio & Detail Modal
  networkInstance.on('click', (params) => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];

      // If it's a word node (not root/group)
      if (typeof nodeId === 'number' || (typeof nodeId === 'string' && nodeId.startsWith('w_'))) {
        const item = state.allWords.find(w => w.id === nodeId || w.word.toLowerCase() === nodeId.replace('w_', '').toLowerCase());

        if (item) {
          playNativeAudio(item.word);
          openModal(item.id);
        } else {
          const wText = nodes.find(n => n.id === nodeId)?.wordText || nodeId;
          playNativeAudio(wText);
        }
      }
    }
  });
}
