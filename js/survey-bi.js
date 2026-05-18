const SURVEY_FILES = {
  manifest: 'data/survey/manifest.json',
  aggregate2025: 'data/survey/aggregate-2025.json',
  aggregate2026: 'data/survey/aggregate-2026.json',
  questions2025: 'data/survey/questions-2025.json',
  questions2026: 'data/survey/questions-2026.json',
  report: 'data/survey/cleaning-report.json',
  members: 'data/members.json',
};

const state = {
  view: 'overview',
  compareKey: 'fanPeriod',
  explorerYear: '2025',
  explorerQuestionId: '2025-Q02',
  genFilter: 'all',
  includeGraduated: true,
  data: null,
};

// Centralized definitions for hover tooltips (B7). Add new indicators here so they get
// consistent copy across all panels.
const INDICATOR_DEFINITIONS = {
  rankedCount: {
    label: '被排序次数 (N)',
    body: '排序题中实际把该成员排入序列的受访者数。≤ 该题应答总样本。',
  },
  averageRank: {
    label: '平均排名',
    body: '该成员被排进的所有位次的算术平均。数值越小越靠前。',
  },
  top1: {
    label: 'Top1 票数',
    body: '该成员被排为第 1 名的次数（原始计数，非比率）。',
  },
  top3: {
    label: 'Top3 票数',
    body: '该成员被排进前 3 名的次数（原始计数，非比率）。',
  },
  score: {
    label: 'Borda Score',
    body: '排序题加权得分：第 1 名得 maxRank 分，第 2 名 maxRank-1 …，未排入 0 分。受候选数影响，跨年原始分不可直接比较。',
  },
  scoreNormalized: {
    label: '归一化 Borda',
    body: 'score / (rankedCount × maxRank)，0–1 区间。控制了候选成员数差异，跨年可对比。',
  },
  top1RateConditional: {
    label: '条件首推率',
    body: 'top1 / rankedCount。在认识/排过 ta 的受访者中，把 ta 推为第 1 名的比例。反映“死忠浓度”——小众但被铁粉真爱的成员会很高。',
  },
  top1RateAbsolute: {
    label: '绝对首推率',
    body: 'top1 / sampleCount。全样本中把 ta 推为第 1 名的比例。反映“群众基础”——认知度高+真爱多的成员会高。',
  },
  top1Share: {
    label: '首推占有率',
    body: '该成员的 top1 占全部 top1 票数之和的比例，所有成员相加 = 100%。类似选举得票率，看头部集中度。',
  },
  top3RateConditional: {
    label: '条件三推率',
    body: 'top3 / rankedCount。在认识/排过 ta 的受访者中，把 ta 推进前 3 名的比例。',
  },
  rankedRate: {
    label: '入榜率',
    body: 'rankedCount / sampleCount。全样本中有多少比例的受访者把 ta 列入排序。反映“认知度 / 可见度”。',
  },
  skipped_by_logic: {
    label: '逻辑跳过',
    body: '受访者因为前置题目的分支逻辑而被自动跳过此题，不计入此题的分子也不计入分母。',
  },
  empty_marker: {
    label: '主动留空',
    body: '受访者主动选择留空但被问卷系统记录为状态的回答。不计入选项计数。',
  },
  answered: {
    label: '有效作答',
    body: '受访者实际给出可解析答案的次数，是大多数比率的分母。',
  },
  blank: {
    label: '空白',
    body: '受访者完全没有填写此题（与“主动留空”不同，未触发状态标记）。',
  },
  generation: {
    label: '期别',
    body: '成员所属期数（1/2/3/4 期）。一期生为 Keyakizaka46 时期沿用；四期生 2024 加入。期别字典维护在 data/members.json。',
  },
  songCloud: {
    label: '词云提取',
    body: '该题为自由文本（每位受访者写"巡演 + 演出 + 歌曲"）。通过樱坂46 + 欅坂46 官方歌单字典做子串匹配，每条答案最多每首歌计 1 次；未识别答案不进入词云。',
  },
};

const fanEraDefinitions = [
  {
    label: '欅坂成团~黒い羊',
    range: '2015-08 至 2019-02',
    monthStart: '2015-08',
    monthEnd: '2019-03',
    aliases2026: ['欅坂成团~黒い羊'],
  },
  {
    label: '黒い羊后~永遠より長い一瞬',
    range: '2019-03 至 2020-10',
    monthStart: '2019-03',
    monthEnd: '2020-11',
    aliases2026: ['永遠より長い一瞬 〜あの頃、確かに存在した私たち〜'],
  },
  {
    label: '櫻坂启动~Nobody’s fault 前',
    range: '2020-11',
    monthStart: '2020-11',
    monthEnd: '2020-12',
    aliases2026: [],
  },
  {
    label: 'Nobody’s fault~As you know?',
    range: '2020-12 至 2022-08',
    monthStart: '2020-12',
    monthEnd: '2022-09',
    aliases2026: ['Nobody‘s Fault 至 As you know?', "Nobody's Fault 至 As you know?"],
  },
  {
    label: 'As you know? 后~桜月前',
    range: '2022-09 至 2023-01',
    monthStart: '2022-09',
    monthEnd: '2023-02',
    aliases2026: [],
  },
  {
    label: '桜月~何歳の頃に戻りたいのか？',
    range: '2023-02 至 2024-02',
    monthStart: '2023-02',
    monthEnd: '2024-03',
    aliases2026: ['桜月 至 何歳の頃に戻りたいのか？'],
  },
  {
    label: '何歳后~自業自得前',
    range: '2024-03 至 2024-05',
    monthStart: '2024-03',
    monthEnd: '2024-06',
    aliases2026: [],
  },
  {
    label: '自業自得',
    range: '2024-06 至 2024-09',
    monthStart: '2024-06',
    monthEnd: '2024-10',
    aliases2026: ['自業自得'],
  },
  {
    label: 'I want tomorrow to come',
    range: '2024-10 至 2025-01',
    monthStart: '2024-10',
    monthEnd: '2025-02',
    aliases2026: ['I want tomorrow to come'],
  },
  {
    label: 'UDAGAWA GENERATION',
    range: '2025-02 至 2025-04',
    monthStart: '2025-02',
    monthEnd: '2025-04',
    aliases2026: ['UDAGAWA GENERATION'],
  },
  {
    label: 'Addiction',
    range: '2025-04 至 2025-06',
    monthStart: '2025-04',
    monthEnd: '2025-06',
    aliases2026: ['Addiction'],
  },
  {
    label: 'Make or Break',
    range: '2025-06 至 2025-10',
    monthStart: '2025-06',
    monthEnd: '2025-10',
    aliases2026: ['Make or Break'],
  },
  {
    label: 'Unhappy birthday構文',
    range: '2025-10 至 2026-03',
    monthStart: '2025-10',
    monthEnd: '2026-03',
    aliases2026: ['Unhappy birthday構文'],
  },
  {
    label: 'The growing up train',
    range: '2026-03 以后',
    monthStart: '2026-03',
    monthEnd: null,
    aliases2026: ['The growing up train'],
  },
];

const compareDefinitions = {
  fanPeriod: {
    title: '成为粉丝的时期',
    copy: '2025 是月份填空，2026 是发行期选项；这里把 2025 月份折算到 2026 发行期口径，并单列 2026 选项没有精确覆盖的发行间隔。',
    custom: 'fanEra',
  },
  firstContact: {
    title: '第一次认识樱坂的入口',
    copy: '2026 年这题只对部分路径展示，所以图中会同时保留回答基数。',
    q2025: '2025-Q02',
    q2026: '2026-Q02',
    labels: [
      ['来自姐妹团（乃木坂/日向坂）'],
      ['Bilibili/抖音/视频平台推荐'],
      ['电视剧/综艺/广播/电影'],
      ['毕业成员的的活动', '毕业成员的的活跃'],
      ['社交媒体'],
      ['家人/朋友/同学/同事推荐'],
      ['J-POP社群'],
      ['音乐节/活动'],
      ['其他'],
    ],
  },
  loveReasons: {
    title: '爱上樱坂的原因',
    copy: '多选题按回答人数占比展示，单项比例相加可能超过 100%。',
    q2025: '2025-Q10',
    q2026: '2026-Q03',
    labels: [
      ['成员/个性'],
      ['现场表演/舞蹈'],
      ['音乐'],
      ['世界观/概念'],
      ['视觉/美学（MV，服装等）'],
      ['综艺'],
      ['与朋友拥有一样的爱好'],
      ['其他'],
    ],
  },
  fanClub: {
    title: 'Official Fan Club 订阅',
    copy: '两年同口径单选题，适合直接对比。',
    q2025: '2025-Q16',
    q2026: '2026-Q18',
    labels: [['是'], ['否']],
  },
  message: {
    title: '成员 Message 订阅',
    copy: '两年同口径单选题，适合直接对比。',
    q2025: '2025-Q17',
    q2026: '2026-Q19',
    labels: [['是'], ['否']],
  },
  ticketIssues: {
    title: '购票难点',
    copy: '多选题按回答人数占比展示，2026 年保留条件跳过人数。',
    q2025: '2025-Q30',
    q2026: '2026-Q28',
    labels: [['日本号码'], ['账号注册'], ['付款方式'], ['语言障碍'], ['网页导航'], ['其他']],
  },
  gender: {
    title: '性别分布',
    copy: '基础画像维度，按回答人数占比展示。',
    q2025: '2025-Q34',
    q2026: '2026-Q33',
    labels: [['女'], ['男'], ['不愿透露']],
  },
  age: {
    title: '年龄段',
    copy: '基础画像维度，按回答人数占比展示。',
    q2025: '2025-Q35',
    q2026: '2026-Q34',
    labels: [['18岁以下'], ['18~25'], ['26~30'], ['31~40'], ['41~50'], ['51岁以上']],
  },
  region: {
    title: '居住地区',
    copy: '2025 问的是“所在地区”，2026 问的是“2025 年居住最久地区”，口径接近但不完全相同。',
    q2025: '2025-Q36',
    q2026: '2026-Q36',
    labels: [['中国大陆地区'], ['港澳台或海外地区', '港澳台和其他海外地区']],
  },
  otherIdols: {
    title: '是否也参与其他偶像',
    copy: '2026 把非日系偶像单独列出；这里把“只看樱坂”和“日系偶像”作为可比项展示。',
    q2025: '2025-Q21',
    q2026: '2026-Q23',
    labels: [['没有，只看樱坂46', '没有，偶像只看樱坂46'], ['有，日本偶像', '有，日系偶像'], ['有，地下/地元偶像', '有，非日系偶像']],
  },
};

const viewNames = {
  overview: '总览',
  compare: '年份对比',
  members: '成员',
  works: '作品',
  tickets: '票务',
  explorer: '题库',
};

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadSurveyData();
});

function setupTabs() {
  document.querySelectorAll('.view-tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      document.querySelectorAll('.view-tab').forEach((item) => {
        item.classList.toggle('is-active', item.dataset.view === state.view);
      });
      render();
    });
  });
}

async function loadSurveyData() {
  const status = document.getElementById('dataStatus');
  try {
    const [manifest, aggregate2025, aggregate2026, questions2025, questions2026, report, members] = await Promise.all(
      Object.values(SURVEY_FILES).map((file) => fetch(file).then((response) => {
        if (!response.ok) {
          throw new Error(`${file}: ${response.status}`);
        }
        return response.json();
      }))
    );

    state.data = {
      manifest,
      aggregates: {
        2025: aggregate2025,
        2026: aggregate2026,
      },
      questions: {
        2025: questions2025,
        2026: questions2026,
      },
      report,
      members: members.members || {},
      membersMeta: members._meta || {},
      memberIndex: buildMemberIndex(members.members || {}),
    };

    status.classList.add('is-ready');
    status.innerHTML = '<span class="status-dot"></span><span>data ready</span>';
    render();
  } catch (error) {
    status.classList.add('is-error');
    status.innerHTML = '<span class="status-dot"></span><span>data failed</span>';
    document.getElementById('dashboardContent').innerHTML = `
      <div class="error-state">
        数据加载失败。请通过本地服务器打开本页，例如 http://127.0.0.1:4173/survey-bi.html。
      </div>
    `;
    console.error(error);
  }
}

// Build a name -> member-record index that resolves aliases. Used by lookupMember().
function buildMemberIndex(members) {
  const index = new Map();
  Object.entries(members).forEach(([name, record]) => {
    const enriched = { name, ...record };
    index.set(name, enriched);
    (record.aliases || []).forEach((alias) => {
      if (!index.has(alias)) {
        index.set(alias, enriched);
      }
    });
  });
  return index;
}

function lookupMember(name) {
  return state.data?.memberIndex?.get(name) || null;
}

function memberPassesGenFilter(name) {
  const record = lookupMember(name);
  const gen = record?.gen ?? null;
  const status = record?.status || 'unknown';
  if (!state.includeGraduated && status === 'graduated') {
    return false;
  }
  if (state.genFilter === 'all') {
    return true;
  }
  if (state.genFilter === 'unknown') {
    return gen == null;
  }
  return String(gen) === state.genFilter;
}

function render() {
  if (!state.data) {
    return;
  }
  renderKpis();
  document.getElementById('toolbarMeta').textContent = `${viewNames[state.view]} / ${formatDate(state.data.manifest.generatedAt)}`;
  const container = document.getElementById('dashboardContent');
  const renderers = {
    overview: renderOverview,
    compare: renderCompare,
    members: renderMembers,
    works: renderWorks,
    tickets: renderTickets,
    explorer: renderExplorer,
  };
  container.innerHTML = renderers[state.view]();
  bindDynamicControls(container);
  bindTooltips(document.getElementById('kpiGrid'));
}

function renderKpis() {
  const aggregate2025 = state.data.aggregates[2025];
  const aggregate2026 = state.data.aggregates[2026];
  const answered2026Q2 = getQuestion(2026, '2026-Q02').statusCounts.answered || 0;
  const skipped2026Q2 = getQuestion(2026, '2026-Q02').statusCounts.skipped_by_logic || 0;
  const kpis = [
    ['Total sample', aggregate2025.sampleCount + aggregate2026.sampleCount, '两年匿名聚合样本'],
    ['2025', aggregate2025.sampleCount, `${aggregate2025.questions.length} 个题目结果`],
    ['2026', aggregate2026.sampleCount, `${aggregate2026.questions.length} 个题目结果`],
    ['2026 branch', answered2026Q2, `${skipped2026Q2} 份由逻辑跳过入坑追问`],
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(([label, value, sub]) => `
    <article class="kpi-card">
      <div class="kpi-label">${escapeHtml(label)}</div>
      <div>
        <div class="kpi-value">${formatNumber(value)}</div>
        <div class="kpi-sub">${escapeHtml(sub)}</div>
      </div>
    </article>
  `).join('');
}

function renderOverview() {
  return `
    <div class="view-layout">
      ${renderFanEraPanel(true)}
      <section class="panel-grid three">
        ${renderMetricPanel('2025-Q34', 2025, '2025 性别', 5)}
        ${renderMetricPanel('2026-Q33', 2026, '2026 性别', 5)}
        ${renderMetricPanel('2026-Q01', 2026, '2026 入坑时期', 7)}
      </section>
      <section class="panel-grid">
        ${renderComparePanel(compareDefinitions.gender, 6)}
        ${renderComparePanel(compareDefinitions.age, 8)}
      </section>
      <section class="panel-grid">
        ${renderMetricPanel('2025-Q01', 2025, '2025 入坑月份', 12)}
        ${renderComparePanel({
          title: '日语水平',
          copy: '基础画像维度，按回答人数占比展示。',
          q2025: '2025-Q39',
          q2026: '2026-Q35',
          labels: [['完全不会'], ['基础水平'], ['日常沟通'], ['母语水平'], ['商务洽谈']],
        }, 5)}
      </section>
      <section class="panel-grid">
        ${renderMetricPanel('2025-Q13', 2025, '2025 偶像活动方式', 12)}
        ${renderMetricPanel('2026-Q08', 2026, '2026 偶像活动方式', 10)}
      </section>
      <section class="panel-grid">
        ${renderMetricPanel('2025-Q19', 2025, '2025 内容获取平台', 10)}
        ${renderMetricPanel('2025-Q14', 2025, '希望官方支持中文区的方式', 10)}
      </section>
      <section class="panel-grid three">
        ${renderComparePanel(compareDefinitions.region, 4)}
        ${renderComparePanel(compareDefinitions.otherIdols, 4)}
        ${renderMetricPanel('2026-Q26', 2026, '2026 对四期生的感受', 6)}
      </section>
    </div>
  `;
}

function renderCompare() {
  const buttons = Object.entries(compareDefinitions).map(([key, definition]) => `
    <button class="selector-button ${state.compareKey === key ? 'is-active' : ''}" type="button" data-compare-key="${key}">
      ${escapeHtml(definition.title)}
    </button>
  `).join('');
  const definition = compareDefinitions[state.compareKey];
  const panel = definition.custom === 'fanEra'
    ? renderFanEraPanel(true)
    : renderComparePanel(definition, 12, true);
  return `
    <div class="view-layout">
      <section class="bi-panel wide">
        <div class="panel-head">
          <div>
            <div class="panel-kicker">comparison set</div>
            <h2 class="panel-title">年份对比</h2>
            <p class="panel-copy">这里先放口径最接近的一批问题。题干或展示逻辑不同的题目会在说明里标出来。</p>
          </div>
        </div>
        <div class="selector-row">${buttons}</div>
      </section>
      ${panel}
    </div>
  `;
}

function renderMembers() {
  const filterChips = renderGenFilter();
  const top1Panel = renderTop1RatePanel('2025-Q03', 2025);
  const scatterPanel = renderRankedVsTop1Scatter('2025-Q03', 2025);
  const sharePanel = renderTop1SharePanel('2025-Q03', 2025);

  return `
    <div class="view-layout">
      ${filterChips}
      <section class="bi-panel wide">
        <div class="panel-head">
          <div>
            <div class="panel-kicker">2025 ranking · 首推率 deep-dive</div>
            <h2 class="panel-title">成员好感排序综合榜</h2>
            <p class="panel-copy">按归一化 Borda 分排序。表头每个指标可悬停查看口径。两种首推率并列展示——条件首推率反映死忠浓度，绝对首推率反映群众基础。</p>
          </div>
        </div>
        ${renderRankingTable('2025-Q03', 2025, 50)}
      </section>
      <section class="panel-grid">
        ${scatterPanel}
        ${sharePanel}
      </section>
      ${top1Panel}
      <section class="panel-grid">
        ${renderMetricPanel('2026-Q04', 2026, '2026 有好感成员', 14, { memberFilter: true })}
        ${renderMetricPanel('2026-Q25', 2026, '2026 C 位预测', 12, { memberFilter: true })}
      </section>
      <section class="panel-grid three">
        ${renderMetricPanel('2026-Q05', 2026, '2026 最喜欢的二期和三期成员', 10, { memberFilter: true })}
        ${renderMetricPanel('2026-Q06', 2026, '2026 最喜欢的四期生成员', 10, { memberFilter: true })}
        ${renderMetricPanel('2026-Q24', 2026, '2025 最佳进步奖', 10, { memberFilter: true })}
      </section>
      <section class="panel-grid">
        ${renderMetricPanel('2025-Q23', 2025, '2024 最佳进步奖', 12, { memberFilter: true })}
        ${renderMetricPanel('2026-Q26', 2026, '对四期生的感受', 6)}
      </section>
      <section class="panel-grid three">
        ${renderMetricPanel('2026-Q12', 2026, '2025 见面会参与成员', 10, { memberFilter: true })}
        ${renderMetricPanel('2026-Q13', 2026, '2025 签名会参与成员', 10, { memberFilter: true })}
      </section>
    </div>
  `;
}

function renderGenFilter() {
  const gens = [
    { key: 'all', label: '全部期别' },
    { key: '1', label: '一期生' },
    { key: '2', label: '二期生' },
    { key: '3', label: '三期生' },
  ];
  const chips = gens.map((gen) => `
    <button class="selector-button ${state.genFilter === gen.key ? 'is-active' : ''}" type="button" data-gen-filter="${gen.key}">
      ${escapeHtml(gen.label)}
    </button>
  `).join('');

  const unresolvedCount = countUnresolvedMembers();
  const warning = unresolvedCount > 0
    ? `<span class="filter-warning" data-tip-id="generation">注意：${unresolvedCount} 位成员的期别尚未在 members.json 中确认。</span>`
    : '';

  return `
    <section class="filter-bar" aria-label="期别筛选">
      <div class="filter-label">
        <span data-tip-id="generation">期别 filter</span>
      </div>
      <div class="selector-row">${chips}</div>
      <label class="filter-checkbox">
        <input type="checkbox" id="includeGraduatedToggle" ${state.includeGraduated ? 'checked' : ''}>
        <span>包含毕业生</span>
      </label>
      ${warning}
    </section>
  `;
}

function countUnresolvedMembers() {
  const members = state.data?.members || {};
  return Object.values(members).filter((record) => record.gen == null && record.status !== 'graduated').length;
}

function renderWorks() {
  return `
    <div class="view-layout">
      ${renderSongCloudPanel('2026-Q17', 2026, '2026 印象最深歌曲演出')}
      <section class="panel-grid">
        ${renderMetricPanel('2025-Q04', 2025, '2025 最喜欢的 A 面 / 主打曲', 10)}
        ${renderMetricPanel('2025-Q09', 2025, '2025 最喜欢的 MV', 10)}
      </section>
      <section class="panel-grid">
        ${renderMetricPanel('2026-Q15', 2026, '2026 最喜欢的 2025 单曲制作', 10)}
        ${renderMetricPanel('2026-Q16', 2026, '2026 最喜欢的 2025 MV', 10)}
      </section>
      <section class="panel-grid three">
        ${renderMetricPanel('2025-Q05', 2025, '2025 附加单曲', 8)}
        ${renderMetricPanel('2025-Q06', 2025, '2025 Unit 曲', 8)}
        ${renderMetricPanel('2025-Q08', 2025, '2025 Backs 曲', 8)}
      </section>
    </div>
  `;
}

function renderSongCloudPanel(questionId, year, title) {
  const question = getQuestion(year, questionId);
  const result = question?.result || {};
  const counts = result.counts || [];
  const matched = result.matchedAnswerCount;
  const answered = result.answeredTextCount || question?.statusCounts?.answered || 0;
  const coverage = (matched != null && answered)
    ? `${matched} / ${answered} 条答案被识别（${formatPercent(matched / answered)}）`
    : '';
  const method = result.extractionMethod
    ? `<span data-tip-id="songCloud">提取方式：${escapeHtml(result.extractionMethod)}</span>`
    : '';

  return `
    <article class="bi-panel wide">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">${year} · word cloud</div>
          <h2 class="panel-title">${escapeHtml(title)}</h2>
          <p class="panel-copy">${method}${method && coverage ? ' / ' : ''}${escapeHtml(coverage)}</p>
        </div>
      </div>
      ${renderWordCloud(counts, { limit: 60 })}
    </article>
  `;
}

function renderWordCloud(counts, { limit = 60 } = {}) {
  if (!counts || !counts.length) {
    return '<div class="empty-state">尚未生成词云数据。</div>';
  }
  const top = counts.slice(0, limit);
  const max = Math.max(...top.map((c) => c.count));
  const min = Math.min(...top.map((c) => c.count));
  const minSize = 12;
  const maxSize = 44;
  const sorted = [...top].sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label));
  return `
    <div class="word-cloud" role="list">
      ${sorted.map((item) => {
        const ratio = max === min ? 0.5 : (item.count - min) / (max - min);
        const size = Math.round(minSize + (maxSize - minSize) * Math.sqrt(ratio));
        const weight = ratio > 0.7 ? 750 : ratio > 0.4 ? 620 : 480;
        const opacity = Math.max(0.55, 0.5 + ratio * 0.5).toFixed(2);
        return `<span class="cloud-word" role="listitem" style="font-size: ${size}px; font-weight: ${weight}; opacity: ${opacity};" title="${escapeHtml(item.label + ' · ' + item.count + ' 次提及')}">${escapeHtml(item.label)}</span>`;
      }).join('')}
    </div>
  `;
}

function renderTickets() {
  return `
    <div class="view-layout">
      ${renderComparePanel(compareDefinitions.ticketIssues, 8, true)}
      <section class="panel-grid">
        ${renderMatrixPanel('2026 投入变化', '相比 2024 年，2025 年在时间、金钱、精力上的变化。', 2026, [
          ['时间', '2026-Q09'],
          ['金钱', '2026-Q09-2'],
          ['精力', '2026-Q09-3'],
        ], ['增加', '不变', '减少', '没有此项投入'])}
        ${renderMatrixPanel('2026 社交半径与远征', '相比 2024 年，一起看偶像的人数与前往日本进行偶像活动次数。', 2026, [
          ['身边同好人数', '2026-Q10'],
          ['赴日偶像活动次数', '2026-Q10-2'],
        ], ['增加', '不变', '减少', '为零'])}
      </section>
      ${renderMatrixPanel('2026 线下/线上活动次数变化', '见面会、签名会、线下 Live 等活动的参与频率变化。', 2026, [
        ['线上/ミーグリ', '2026-Q11'],
        ['线下/リアル', '2026-Q11-2'],
        ['线上签名', '2026-Q11-3'],
        ['线下签名', '2026-Q11-4'],
        ['线下 Live', '2026-Q11-5'],
      ], ['增加', '不变', '减少', '没有参加'], true)}
      <section class="panel-grid three">
        ${renderMetricPanel('2025-Q29', 2025, '2025 门票抽选难度评分', 10)}
        ${renderMetricPanel('2025-Q31', 2025, '2024 海外票体验评分', 10)}
        ${renderMetricPanel('2025-Q32', 2025, '中文区海外票购买意愿', 10)}
      </section>
      <section class="panel-grid three">
        ${renderMetricPanel('2026-Q29', 2026, '2025 是否参与海外席抽选', 8)}
        ${renderMetricPanel('2026-Q31', 2026, '2025 海外票抽选感受', 8)}
        ${renderMetricPanel('2026-Q32', 2026, '2025 海外席观看体验', 8)}
      </section>
      <section class="panel-grid">
        ${renderMetricPanel('2026-Q30', 2026, '2025 海外席中选场次', 10)}
        ${renderMetricPanel('2026-Q12', 2026, '2025 见面会参与成员', 10)}
      </section>
    </div>
  `;
}

function renderExplorer() {
  const yearOptions = ['2025', '2026'].map((year) => `
    <option value="${year}" ${state.explorerYear === year ? 'selected' : ''}>${year}</option>
  `).join('');
  const questionOptions = state.data.aggregates[state.explorerYear].questions.map((question) => `
    <option value="${question.questionId}" ${state.explorerQuestionId === question.questionId ? 'selected' : ''}>
      Q${String(question.number).padStart(2, '0')} / ${escapeHtml(question.title)}
    </option>
  `).join('');
  const question = getQuestion(state.explorerYear, state.explorerQuestionId);
  const methodRows = [
    ['marker policy', '（跳过）与（空）作为状态保留，不进入选项排行。'],
    ['other detail', '其他〖...〗会拆成 label/detail，公开页面只显示 label 和 detail 出现次数。'],
    ['privacy', '公开 JSON 不包含 IP、提交时间、提交来源和自由文本原文。'],
    ['fan period', '2026 的入坑时期按发行节点映射；2025 的月份填空按月份落入相同发行期区间。'],
    ['period caveat', '2025 问卷提交在 2025 年 1 月，无法覆盖 Udagawa Generation 之后的新入坑期。'],
    ['source', state.data.manifest.sources['2025Responses'] + ' / ' + state.data.manifest.sources['2026Responses']],
  ];

  return `
    <div class="view-layout">
      <section class="question-picker">
        <label>
          年份
          <select id="explorerYear">${yearOptions}</select>
        </label>
        <label>
          题目
          <select id="explorerQuestion">${questionOptions}</select>
        </label>
      </section>
      <section class="panel-grid">
        ${renderQuestionResult(question, Number(state.explorerYear), 16)}
        <article class="bi-panel">
          <div class="panel-head">
            <div>
              <div class="panel-kicker">cleaning method</div>
              <h2 class="panel-title">清理口径</h2>
              <p class="panel-copy">这一页用于核查题目、状态和聚合结果。后续 BI 正式页可以继续复用这些 JSON。</p>
            </div>
          </div>
          <div class="method-list">
            ${methodRows.map(([key, value]) => `
              <div class="method-row">
                <div class="method-key">${escapeHtml(key)}</div>
                <div class="method-value">${escapeHtml(value)}</div>
              </div>
            `).join('')}
          </div>
        </article>
      </section>
    </div>
  `;
}

function bindDynamicControls(container) {
  container.querySelectorAll('[data-compare-key]').forEach((button) => {
    button.addEventListener('click', () => {
      state.compareKey = button.dataset.compareKey;
      render();
    });
  });

  container.querySelectorAll('[data-gen-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.genFilter = button.dataset.genFilter;
      render();
    });
  });

  const includeGraduated = container.querySelector('#includeGraduatedToggle');
  if (includeGraduated) {
    includeGraduated.addEventListener('change', () => {
      state.includeGraduated = includeGraduated.checked;
      render();
    });
  }

  const yearSelect = container.querySelector('#explorerYear');
  if (yearSelect) {
    yearSelect.addEventListener('change', () => {
      state.explorerYear = yearSelect.value;
      state.explorerQuestionId = state.data.aggregates[state.explorerYear].questions[0].questionId;
      render();
    });
  }

  const questionSelect = container.querySelector('#explorerQuestion');
  if (questionSelect) {
    questionSelect.addEventListener('change', () => {
      state.explorerQuestionId = questionSelect.value;
      render();
    });
  }

  bindTooltips(container);
}

// B7: hover tooltips. Targets any element with data-tip-id whose id matches INDICATOR_DEFINITIONS.
// Uses a singleton floating element so we don't pollute the DOM with hundreds of tooltip nodes.
let tooltipEl = null;
let activeTipTarget = null;

function ensureTooltipEl() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'bi-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.hidden = true;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(target) {
  const id = target.dataset.tipId;
  const def = INDICATOR_DEFINITIONS[id];
  if (!def) return;
  const el = ensureTooltipEl();
  el.innerHTML = `<div class="bi-tooltip-label">${escapeHtml(def.label)}</div><div class="bi-tooltip-body">${escapeHtml(def.body)}</div>`;
  el.hidden = false;
  activeTipTarget = target;
  positionTooltip(target);
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.hidden = true;
  activeTipTarget = null;
}

function positionTooltip(target) {
  if (!tooltipEl || tooltipEl.hidden) return;
  const rect = target.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();
  const margin = 8;
  let left = rect.left + window.scrollX + (rect.width / 2) - (tipRect.width / 2);
  let top = rect.bottom + window.scrollY + margin;
  // clamp horizontally
  const maxLeft = window.scrollX + document.documentElement.clientWidth - tipRect.width - margin;
  if (left < margin) left = margin;
  if (left > maxLeft) left = maxLeft;
  // flip above target if it would clip below the viewport
  if (rect.bottom + tipRect.height + margin > window.innerHeight) {
    top = rect.top + window.scrollY - tipRect.height - margin;
  }
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

function bindTooltips(container) {
  const targets = container.querySelectorAll('[data-tip-id]');
  targets.forEach((target) => {
    target.classList.add('has-tip');
    target.setAttribute('tabindex', target.tabIndex >= 0 ? String(target.tabIndex) : '0');
    target.addEventListener('mouseenter', () => showTooltip(target));
    target.addEventListener('mouseleave', hideTooltip);
    target.addEventListener('focus', () => showTooltip(target));
    target.addEventListener('blur', hideTooltip);
  });
}

// Reposition on scroll/resize so the bubble follows its anchor.
window.addEventListener('scroll', () => {
  if (activeTipTarget) positionTooltip(activeTipTarget);
}, { passive: true });
window.addEventListener('resize', () => {
  if (activeTipTarget) positionTooltip(activeTipTarget);
});

function renderMetricPanel(questionId, year, title, limit = 8, options = {}) {
  const question = getQuestion(year, questionId);
  return renderQuestionResult(question, year, limit, title, options);
}

function renderTop1RatePanel(questionId, year) {
  const question = getQuestion(year, questionId);
  const allItems = question?.result?.items || [];
  const sampleCount = state.data.aggregates[year].sampleCount || 0;
  const items = allItems
    .filter((item) => memberPassesGenFilter(item.item))
    .map((item) => {
      const ranked = item.rankedCount || 0;
      return {
        name: item.item,
        member: lookupMember(item.item) || {},
        condRate: ranked ? (item.top1 || 0) / ranked : 0,
        absRate: sampleCount ? (item.top1 || 0) / sampleCount : 0,
        top1: item.top1 || 0,
        rankedCount: ranked,
      };
    })
    .sort((a, b) => b.condRate - a.condRate);

  const maxCond = Math.max(0.01, ...items.map((row) => row.condRate));
  const maxAbs = Math.max(0.01, ...items.map((row) => row.absRate));

  return `
    <article class="bi-panel wide">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">${year} · 首推率 双指标榜</div>
          <h2 class="panel-title">首推率：死忠浓度 vs 群众基础</h2>
          <p class="panel-copy">同一位成员同时显示两种首推率。<span data-tip-id="top1RateConditional">条件首推率</span>看分母仅是认识 ta 的人；<span data-tip-id="top1RateAbsolute">绝对首推率</span>看分母是全样本。两者错位最大的成员通常是“小众真爱”或“高认知低狂热”。</p>
        </div>
      </div>
      <div class="dual-rate-grid">
        <div class="dual-rate-header">
          <span>成员</span>
          <span data-tip-id="top1RateConditional">条件首推率</span>
          <span data-tip-id="top1RateAbsolute">绝对首推率</span>
          <span data-tip-id="top1">top1 / N</span>
        </div>
        ${items.map((row) => `
          <div class="dual-rate-row">
            <span class="dual-rate-name">${escapeHtml(row.name)} ${renderGenBadge(row.member)}</span>
            <span class="dual-rate-bar">
              <span class="bar-track"><span class="bar-fill compare-fill-2025" style="--bar-width: ${Math.round((row.condRate / maxCond) * 100)}%"></span></span>
              <span class="dual-rate-value">${formatPercent(row.condRate)}</span>
            </span>
            <span class="dual-rate-bar">
              <span class="bar-track"><span class="bar-fill compare-fill-2026" style="--bar-width: ${Math.round((row.absRate / maxAbs) * 100)}%"></span></span>
              <span class="dual-rate-value">${formatPercent(row.absRate)}</span>
            </span>
            <span class="dual-rate-meta">${formatNumber(row.top1)} / ${formatNumber(row.rankedCount)}</span>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderRankedVsTop1Scatter(questionId, year) {
  const question = getQuestion(year, questionId);
  const allItems = question?.result?.items || [];
  const sampleCount = state.data.aggregates[year].sampleCount || 1;
  const items = allItems
    .filter((item) => memberPassesGenFilter(item.item))
    .map((item) => {
      const ranked = item.rankedCount || 0;
      return {
        name: item.item,
        member: lookupMember(item.item) || {},
        x: ranked / sampleCount,
        y: ranked ? (item.top1 || 0) / ranked : 0,
        top1: item.top1 || 0,
        rankedCount: ranked,
      };
    });

  const maxX = Math.max(0.01, ...items.map((row) => row.x));
  const maxY = Math.max(0.01, ...items.map((row) => row.y));

  const dots = items.map((row) => {
    const left = (row.x / maxX) * 100;
    const top = 100 - (row.y / maxY) * 100;
    const tip = `${row.name} / 入榜率 ${formatPercent(row.x)} / 条件首推率 ${formatPercent(row.y)} / top1=${row.top1} N=${row.rankedCount}`;
    const gen = row.member.gen ?? 'unknown';
    return `
      <span class="scatter-dot gen-dot-${gen}" style="left: ${left}%; top: ${top}%;" title="${escapeHtml(tip)}">
        <span class="scatter-label">${escapeHtml(row.name)}</span>
      </span>
    `;
  }).join('');

  return `
    <article class="bi-panel">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">${year} · scatter</div>
          <h2 class="panel-title">入榜率 × 首推率 四象限</h2>
          <p class="panel-copy">横轴 <span data-tip-id="rankedRate">入榜率</span>（认知度），纵轴 <span data-tip-id="top1RateConditional">条件首推率</span>（铁粉浓度）。右上 = 天下第一推；左上 = 小众真爱；右下 = 国民好感；左下 = 待发掘。</p>
        </div>
      </div>
      <div class="scatter-plot">
        <div class="scatter-grid">
          <span class="quadrant-label top-left">小众真爱</span>
          <span class="quadrant-label top-right">天下第一推</span>
          <span class="quadrant-label bottom-left">待发掘</span>
          <span class="quadrant-label bottom-right">国民好感</span>
          ${dots}
        </div>
        <div class="scatter-axis-x">
          <span>0%</span>
          <span data-tip-id="rankedRate">入榜率 →</span>
          <span>${formatPercent(maxX)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderTop1SharePanel(questionId, year) {
  const question = getQuestion(year, questionId);
  const allItems = question?.result?.items || [];
  const filtered = allItems.filter((item) => memberPassesGenFilter(item.item));
  const totalTop1 = allItems.reduce((sum, item) => sum + (item.top1 || 0), 0);

  const rows = filtered
    .map((item) => ({
      name: item.item,
      member: lookupMember(item.item) || {},
      top1: item.top1 || 0,
      share: totalTop1 ? (item.top1 || 0) / totalTop1 : 0,
    }))
    .sort((a, b) => b.share - a.share);

  const maxShare = Math.max(0.01, ...rows.map((row) => row.share));
  const filteredShareSum = rows.reduce((sum, row) => sum + row.share, 0);

  return `
    <article class="bi-panel">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">${year} · top1 distribution</div>
          <h2 class="panel-title">首推占有率</h2>
          <p class="panel-copy"><span data-tip-id="top1Share">首推占有率</span>类似选举得票率，全部成员之和 = 100%。当前筛选下成员占 ${formatPercent(filteredShareSum)} 的首推票。</p>
        </div>
      </div>
      <div class="share-list">
        ${rows.map((row) => `
          <div class="share-row">
            <span class="share-name">${escapeHtml(row.name)} ${renderGenBadge(row.member)}</span>
            <span class="bar-track"><span class="bar-fill" style="--bar-width: ${Math.round((row.share / maxShare) * 100)}%"></span></span>
            <span class="share-value">${formatPercent(row.share)}</span>
          </div>
        `).join('')}
      </div>
    </article>
  `;
}

function renderFanEraPanel(wide = false) {
  const rows = buildFanEraRows();
  const maxPct = Math.max(0.01, ...rows.flatMap((row) => [row.pct2025, row.pct2026]));
  return `
    <article class="bi-panel ${wide ? 'wide' : ''}">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">cohort bridge</div>
          <h2 class="panel-title">成为粉丝时期：月份口径折算到发行期</h2>
          <p class="panel-copy">2025 是“YYYY-MM”填空，2026 是发行期选项。这里把 2025 月份落到 2026 的发行期框架里，并单列 2026 选项没有精确覆盖的发行间隔；因为 2025 问卷发生在 2025 年 1 月，后续发行期不会出现在 2025 样本中。</p>
        </div>
      </div>
      <div class="metric-strip">
        ${renderBaseMetric('2025 month answers', answerBase(getQuestion(2025, '2025-Q01')), getQuestion(2025, '2025-Q01'))}
        ${renderBaseMetric('2026 era answers', answerBase(getQuestion(2026, '2026-Q01')), getQuestion(2026, '2026-Q01'))}
        ${renderBaseMetric('mapped eras', fanEraDefinitions.length)}
        ${renderBaseMetric('post-2025 eras', rows.filter((row) => row.count2025 === 0 && row.count2026 > 0).length)}
      </div>
      <div class="timeline-list">
        ${rows.map((row) => renderFanEraRow(row, maxPct)).join('')}
      </div>
    </article>
  `;
}

function renderFanEraRow(row, maxPct) {
  const width2025 = Math.round((row.pct2025 / maxPct) * 100);
  const width2026 = Math.round((row.pct2026 / maxPct) * 100);
  return `
    <div class="timeline-row">
      <div>
        <div class="timeline-label">${escapeHtml(row.label)}</div>
        <div class="timeline-range">${escapeHtml(row.range)}</div>
      </div>
      <div class="compare-bars">
        <div class="compare-line">
          <span class="compare-year">2025</span>
          <span class="bar-track"><span class="bar-fill compare-fill-2025" style="--bar-width: ${width2025}%"></span></span>
        </div>
        <div class="compare-line">
          <span class="compare-year">2026</span>
          <span class="bar-track"><span class="bar-fill compare-fill-2026" style="--bar-width: ${width2026}%"></span></span>
        </div>
      </div>
      <div class="compare-value">
        ${formatNumber(row.count2025)} / ${formatPercent(row.pct2025)}<br>
        ${formatNumber(row.count2026)} / ${formatPercent(row.pct2026)}
      </div>
    </div>
  `;
}

function buildFanEraRows() {
  const q2025 = getQuestion(2025, '2025-Q01');
  const q2026 = getQuestion(2026, '2026-Q01');
  const monthlyCounts = q2025?.result?.counts || [];
  const eraCounts2026 = q2026?.result?.counts || [];
  const base2025 = answerBase(q2025);
  const base2026 = answerBase(q2026);

  return fanEraDefinitions.map((era) => {
    const start = monthToIndex(era.monthStart);
    const end = era.monthEnd ? monthToIndex(era.monthEnd) : Number.POSITIVE_INFINITY;
    const count2025 = monthlyCounts.reduce((sum, item) => {
      const month = monthToIndex(item.label);
      return month >= start && month < end ? sum + item.count : sum;
    }, 0);
    const count2026 = eraCounts2026.reduce((sum, item) => {
      return era.aliases2026.includes(item.label) ? sum + item.count : sum;
    }, 0);
    return {
      label: era.label,
      range: era.range,
      count2025,
      count2026,
      pct2025: base2025 ? count2025 / base2025 : 0,
      pct2026: base2026 ? count2026 / base2026 : 0,
    };
  });
}

function renderMatrixPanel(title, copy, year, rows, categories, wide = false) {
  const matrixRows = rows.map(([label, qid]) => {
    const question = getQuestion(year, qid);
    const base = answerBase(question);
    const values = categories.map((category) => {
      const count = countForAliases(question, [category]);
      return {
        label: category,
        count,
        pct: base ? count / base : 0,
      };
    }).filter((item) => item.count > 0);
    return { label, question, values };
  });

  return `
    <article class="bi-panel ${wide ? 'wide' : ''}">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">${year} matrix</div>
          <h2 class="panel-title">${escapeHtml(title)}</h2>
          <p class="panel-copy">${escapeHtml(copy)}</p>
        </div>
      </div>
      <div class="matrix-chart">
        ${matrixRows.map((row) => renderMatrixRow(row)).join('')}
      </div>
    </article>
  `;
}

function renderMatrixRow(row) {
  return `
    <div class="matrix-row">
      <div class="matrix-label">${escapeHtml(row.label)}</div>
      <div class="matrix-cells">
        ${row.values.map((value) => `
          <div class="matrix-cell">
            <div class="matrix-cell-head">
              <span>${escapeHtml(value.label)}</span>
              <span>${formatPercent(value.pct)}</span>
            </div>
            <span class="bar-track"><span class="bar-fill" style="--bar-width: ${Math.max(3, Math.round(value.pct * 100))}%"></span></span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderQuestionResult(question, year, limit = 8, titleOverride = null, options = {}) {
  if (!question) {
    return '<article class="bi-panel"><div class="empty-state">missing question</div></article>';
  }
  const result = question.result;
  let body = '';
  if (result.counts) {
    let counts = result.counts;
    if (options.memberFilter) {
      counts = counts.filter((entry) => entry.label === '以上均无' || memberPassesGenFilter(entry.label));
    }
    body = renderBars(counts, answerBase(question), limit);
  } else if (result.items) {
    body = renderRankingTable(question.questionId, year, limit);
  } else if (result.fields) {
    body = renderRatioFields(result.fields);
  } else {
    body = renderTextStats(result);
  }
  return `
    <article class="bi-panel">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">${year} / ${escapeHtml(question.kind)}</div>
          <h2 class="panel-title">${escapeHtml(titleOverride || question.title)}</h2>
          ${renderStatusNote(question)}
        </div>
      </div>
      ${body}
    </article>
  `;
}

function renderComparePanel(definition, limit = 8, wide = false) {
  const question2025 = getQuestion(2025, definition.q2025);
  const question2026 = getQuestion(2026, definition.q2026);
  const rows = definition.labels.map((aliases) => {
    const label = aliases[0];
    const value2025 = countForAliases(question2025, aliases);
    const value2026 = countForAliases(question2026, aliases);
    const base2025 = answerBase(question2025);
    const base2026 = answerBase(question2026);
    return {
      label,
      count2025: value2025,
      count2026: value2026,
      pct2025: base2025 ? value2025 / base2025 : 0,
      pct2026: base2026 ? value2026 / base2026 : 0,
    };
  }).sort((a, b) => (b.pct2025 + b.pct2026) - (a.pct2025 + a.pct2026)).slice(0, limit);

  const maxPct = Math.max(0.01, ...rows.flatMap((row) => [row.pct2025, row.pct2026]));
  return `
    <article class="bi-panel ${wide ? 'wide' : ''}">
      <div class="panel-head">
        <div>
          <div class="panel-kicker">2025 vs 2026</div>
          <h2 class="panel-title">${escapeHtml(definition.title)}</h2>
          <p class="panel-copy">${escapeHtml(definition.copy)}</p>
        </div>
      </div>
      <div class="metric-strip">
        ${renderBaseMetric('2025 answered', answerBase(question2025), question2025)}
        ${renderBaseMetric('2026 answered', answerBase(question2026), question2026)}
        ${renderBaseMetric('2025 sample', state.data.aggregates[2025].sampleCount)}
        ${renderBaseMetric('2026 sample', state.data.aggregates[2026].sampleCount)}
      </div>
      <div class="compare-chart" style="margin-top: 18px">
        ${rows.map((row) => renderCompareRow(row, maxPct)).join('')}
      </div>
    </article>
  `;
}

function renderBaseMetric(label, value, question = null) {
  const skipped = question ? question.statusCounts.skipped_by_logic || 0 : 0;
  return `
    <div class="metric-box">
      <div class="metric-meta">${escapeHtml(label)}</div>
      <div class="metric-value">${formatNumber(value)}</div>
      <div class="kpi-sub">${skipped ? `${formatNumber(skipped)} skipped` : 'ready'}</div>
    </div>
  `;
}

function renderCompareRow(row, maxPct) {
  const width2025 = Math.round((row.pct2025 / maxPct) * 100);
  const width2026 = Math.round((row.pct2026 / maxPct) * 100);
  return `
    <div class="compare-row">
      <div class="bar-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</div>
      <div class="compare-bars">
        <div class="compare-line">
          <span class="compare-year">2025</span>
          <span class="bar-track"><span class="bar-fill compare-fill-2025" style="--bar-width: ${width2025}%"></span></span>
        </div>
        <div class="compare-line">
          <span class="compare-year">2026</span>
          <span class="bar-track"><span class="bar-fill compare-fill-2026" style="--bar-width: ${width2026}%"></span></span>
        </div>
      </div>
      <div class="compare-value">
        ${formatPercent(row.pct2025)} / ${formatPercent(row.pct2026)}
      </div>
    </div>
  `;
}

function renderBars(counts, denominator, limit = 8) {
  const rows = counts.slice(0, limit);
  const max = Math.max(1, ...rows.map((row) => row.count));
  return `
    <div class="bar-chart">
      ${rows.map((row) => {
        const pct = denominator ? row.count / denominator : 0;
        const width = Math.round((row.count / max) * 100);
        return `
          <div class="bar-row">
            <div class="bar-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</div>
            <div class="bar-track"><span class="bar-fill" style="--bar-width: ${width}%"></span></div>
            <div class="bar-value">${formatNumber(row.count)} / ${formatPercent(pct)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderRankingTable(questionId, year, limit = 12) {
  const question = getQuestion(year, questionId);
  const result = question?.result || {};
  const allItems = result.items || [];
  const maxRank = result.maxRank || allItems.length || 1;
  const sampleCount = state.data.aggregates[year].sampleCount || 0;
  const totalTop1 = allItems.reduce((sum, item) => sum + (item.top1 || 0), 0);

  const filteredItems = allItems.filter((item) => memberPassesGenFilter(item.item));
  const items = filteredItems.slice(0, limit);

  const headerCell = (key, text) => `<th data-tip-id="${key}">${text}</th>`;

  return `
    <div class="table-wrap">
      <table class="rank-table">
        <thead>
          <tr>
            <th>#</th>
            <th>成员</th>
            <th>期</th>
            ${headerCell('scoreNormalized', 'Score*')}
            ${headerCell('top1RateConditional', '条件首推率')}
            ${headerCell('top1RateAbsolute', '绝对首推率')}
            ${headerCell('top1Share', '占有率')}
            ${headerCell('top1', 'Top1')}
            ${headerCell('top3', 'Top3')}
            ${headerCell('averageRank', 'Avg')}
            ${headerCell('rankedCount', 'N')}
            ${headerCell('rankedRate', '入榜率')}
          </tr>
        </thead>
        <tbody>
          ${items.map((item, index) => {
            const member = lookupMember(item.item) || {};
            const ranked = item.rankedCount || 0;
            const scoreNorm = item.scoreNormalized != null
              ? item.scoreNormalized
              : (ranked && maxRank ? (item.score || 0) / (ranked * maxRank) : 0);
            const condRate = ranked ? (item.top1 || 0) / ranked : 0;
            const absRate = sampleCount ? (item.top1 || 0) / sampleCount : 0;
            const share = totalTop1 ? (item.top1 || 0) / totalTop1 : 0;
            const rankedRate = sampleCount ? ranked / sampleCount : 0;
            const genBadge = renderGenBadge(member);
            const gradMark = member.status === 'graduated' ? ' <span class="grad-mark" title="已毕业">卒</span>' : '';
            return `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.item)}${gradMark}</td>
                <td>${genBadge}</td>
                <td>${formatRatio(scoreNorm, 3)}</td>
                <td>${formatPercent(condRate)}</td>
                <td>${formatPercent(absRate)}</td>
                <td>${formatPercent(share)}</td>
                <td>${formatNumber(item.top1)}</td>
                <td>${formatNumber(item.top3)}</td>
                <td>${item.averageRank}</td>
                <td>${formatNumber(ranked)}</td>
                <td>${formatPercent(rankedRate)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      <p class="chart-note">* Score 列为归一化 Borda（0–1），跨年可比；原始 Borda 分见悬停说明。当前筛选下显示 ${items.length} / ${filteredItems.length} 位成员；总候选 ${allItems.length} 位，maxRank=${maxRank}，样本 N=${sampleCount}。</p>
    </div>
  `;
}

function renderGenBadge(member) {
  const gen = member.gen;
  if (gen == null) {
    return '<span class="gen-badge gen-unknown" title="期别未确认">?</span>';
  }
  return `<span class="gen-badge gen-${gen}">${gen}</span>`;
}

function formatRatio(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(digits);
}

function renderRatioFields(fields) {
  const entries = Object.entries(fields);
  if (!entries.length) {
    return '<div class="empty-state">no ratio data</div>';
  }
  const rows = entries.map(([label, payload]) => ({
    label,
    average: payload.average || 0,
    min: payload.min,
    max: payload.max,
  }));
  const maxValue = Math.max(1, ...rows.map((row) => row.average));
  return `
    <div class="bar-chart">
      ${rows.map((row) => {
        const width = Math.round((row.average / maxValue) * 100);
        const range = (row.min != null && row.max != null) ? ` (min ${row.min} / max ${row.max})` : '';
        return `
          <div class="bar-row">
            <div class="bar-label" title="${escapeHtml(row.label + range)}">${escapeHtml(row.label)}</div>
            <div class="bar-track"><span class="bar-fill" style="--bar-width: ${width}%"></span></div>
            <div class="bar-value">avg ${row.average}%</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderTextStats(result) {
  return `
    <div class="metric-strip">
      ${renderSimpleMetric('answered text', result.answeredTextCount || 0)}
      ${renderSimpleMetric('avg length', result.averageLength || 0)}
      ${renderSimpleMetric('max length', result.maxLength || 0)}
      ${renderSimpleMetric('public samples', result.samples?.length || 0)}
    </div>
  `;
}

function renderSimpleMetric(label, value) {
  return `
    <div class="metric-box">
      <div class="metric-meta">${escapeHtml(label)}</div>
      <div class="metric-value">${formatNumber(value)}</div>
    </div>
  `;
}

function renderStatusNote(question) {
  const status = question.statusCounts || {};
  const bits = Object.entries(status).map(([key, value]) => {
    const tipAttr = INDICATOR_DEFINITIONS[key] ? ` data-tip-id="${key}"` : '';
    return `<span${tipAttr}>${escapeHtml(key)}: ${formatNumber(value)}</span>`;
  });
  return `<p class="panel-copy status-line">${bits.join(' / ')}</p>`;
}

function getQuestion(year, questionId) {
  const aggregate = state.data?.aggregates?.[year];
  if (!aggregate) {
    return null;
  }
  return aggregate.questions.find((question) => question.questionId === questionId) || null;
}

function answerBase(question) {
  if (!question) {
    return 0;
  }
  return question.statusCounts.answered || question.statusCounts.empty_marker || 0;
}

function countForAliases(question, aliases) {
  const counts = question?.result?.counts || [];
  return counts.reduce((sum, item) => {
    return aliases.includes(item.label) ? sum + item.count : sum;
  }, 0);
}

function monthToIndex(month) {
  const match = String(month).match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    return Number.NEGATIVE_INFINITY;
  }
  return Number(match[1]) * 12 + Number(match[2]);
}

function formatNumber(value) {
  return new Intl.NumberFormat('zh-CN').format(value);
}

function formatPercent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function formatDate(value) {
  if (!value) {
    return 'no timestamp';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
