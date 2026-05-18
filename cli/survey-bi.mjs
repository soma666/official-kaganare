#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const SURVEY_FILES = {
  manifest: 'manifest.json',
  catalog: 'agent-catalog.json',
  aggregate2025: 'aggregate-2025.json',
  aggregate2026: 'aggregate-2026.json',
  crosstabs: 'crosstabs.json',
  flows: 'flows.json',
  networks: 'networks.json',
  keywords: 'keywords.json',
  insights: 'insights.json',
  comparability: 'comparability.json',
  segments: 'segments.json',
  memberProfiles: 'member-profiles.json',
};

const MEMBER_FILE = 'members.json';

const PRESETS = {
  era_activity_2026: { year: '2026', x: 'fan_era', y: 'activity_methods', mode: 'lift' },
  language_ticket_2026: { year: '2026', x: 'japanese_level', y: 'ticket_issues', mode: 'lift' },
  depth_support_2025: { year: '2025', x: 'participation_depth', y: 'official_support', mode: 'lift' },
  investment_song_2026: { year: '2026', x: 'investment_mood', y: 'favorite_song', mode: 'lift' },
  depth_members_2026: { year: '2026', x: 'participation_depth', y: 'favorite_members', mode: 'lift' },
  segment_overseas_2026: { year: '2026', x: 'behavior_segment', y: 'overseas_lottery', mode: 'rate' },
};

const INSIGHT_THEMES = {
  member: ['favorite_members', 'fan_club', 'message', 'message_count'],
  activity: ['activity_methods', 'love_reasons', 'other_idols', 'content_creation'],
  ticket: ['ticket_issues', 'overseas_lottery', 'overseas_ticket_feel'],
  works: ['favorite_song', 'favorite_mv', 'content_platforms', 'official_support'],
  investment: ['investment_time', 'investment_money', 'investment_energy', 'fourth_gen_feeling'],
};

const args = parseArgs(process.argv.slice(2));
const command = args._[0] || 'help';

main().catch((error) => {
  output({
    ok: false,
    error: error.message,
    command,
  }, args);
  process.exitCode = 1;
});

async function main() {
  if (command === 'help' || args.help || args.h) {
    outputHelp();
    return;
  }

  const ctx = createContext(args);
  const result = await runCommand(command, args, ctx);
  output(result, args);
}

async function runCommand(name, options, ctx) {
  if (name === 'meta') {
    const [manifest, catalog] = await Promise.all([loadSurveyJson(ctx, 'manifest'), loadSurveyJson(ctx, 'catalog')]);
    return ok({ manifest, catalog: summarizeCatalog(catalog) });
  }

  if (name === 'catalog') {
    const catalog = await loadSurveyJson(ctx, 'catalog');
    return ok(filterCatalog(catalog, options));
  }

  if (name === 'find') {
    const query = options._.slice(1).join(' ').trim();
    if (!query) throw new Error('find requires a search term.');
    const catalog = await loadSurveyJson(ctx, 'catalog');
    return ok({ query, results: findCatalog(catalog, query, Number(options.top || 20)) });
  }

  if (name === 'question') {
    const questionId = options._[1];
    if (!questionId) throw new Error('question requires a questionId, e.g. 2026-Q01.');
    const year = inferYear(options.year || questionId);
    const aggregate = await loadAggregate(ctx, year);
    const question = aggregate.questions.find((item) => item.questionId === questionId);
    if (!question) throw new Error(`Question not found: ${questionId}`);
    return ok({ year, question: trimQuestion(question, Number(options.top || 20)) });
  }

  if (name === 'crosstab') {
    const crosstabs = await loadSurveyJson(ctx, 'crosstabs');
    const year = String(options.year || '');
    const x = options.x || options.dimension;
    const y = options.y || options.metric;
    if (!year || !x || !y) throw new Error('crosstab requires --year, --x and --y.');
    const table = crosstabs.tables.find((item) => String(item.year) === year && item.dimensionId === x && item.metricId === y);
    if (!table) throw new Error(`Crosstab not found: year=${year}, x=${x}, y=${y}`);
    return ok({ table: summarizeCrosstab(table, options) });
  }

  if (name === 'insights') {
    const insights = await loadSurveyJson(ctx, 'insights');
    return ok({ insights: filterInsights(insights.items || [], options) });
  }

  if (name === 'keywords') {
    const questionId = options._[1] || options.question || options.questionId;
    if (!questionId) throw new Error('keywords requires a questionId, e.g. 2026-Q17.');
    const keywords = await loadSurveyJson(ctx, 'keywords');
    const item = keywords.questions.find((question) => question.questionId === questionId);
    if (!item) throw new Error(`Keyword question not found: ${questionId}`);
    return ok({
      question: {
        ...pick(item, ['year', 'questionId', 'title', 'method', 'minCount', 'answeredTextCount']),
        keywords: (item.keywords || []).slice(0, Number(options.top || 30)),
        themes: item.themes || [],
      },
    });
  }

  if (name === 'flow') {
    const flows = await loadSurveyJson(ctx, 'flows');
    const year = String(options.year || '');
    const id = options.id || options._[1];
    if (!year || !id) throw new Error('flow requires --year and --id.');
    const flow = (flows.years?.[year] || []).find((item) => item.id === id);
    if (!flow) throw new Error(`Flow not found: year=${year}, id=${id}`);
    return ok({ flow: summarizeFlow(flow, options) });
  }

  if (name === 'network') {
    const networks = await loadSurveyJson(ctx, 'networks');
    const year = String(options.year || '');
    const id = options.id || options._[1];
    if (!year || !id) throw new Error('network requires --year and --id.');
    const network = (networks.years?.[year] || []).find((item) => item.id === id);
    if (!network) throw new Error(`Network not found: year=${year}, id=${id}`);
    return ok({ network: summarizeNetwork(network, options) });
  }

  if (name === 'member-profile') {
    const profiles = await loadSurveyJson(ctx, 'memberProfiles');
    const year = String(options.year || '2026');
    const support = options.support || defaultMemberSupport(year);
    const member = options.member || options._[1];
    if (!profiles.years?.[year]) throw new Error(`Member profiles not found for year=${year}.`);
    if (!member) {
      return ok({ memberProfiles: listMemberProfiles(profiles, year, support, options) });
    }
    return ok({ memberProfile: summarizeMemberProfile(profiles, year, support, member, options) });
  }

  if (name === 'member-similar') {
    const profiles = await loadSurveyJson(ctx, 'memberProfiles');
    const year = String(options.year || '2026');
    const support = options.support || defaultMemberSupport(year);
    const member = options.member || options._[1];
    if (!member) throw new Error('member-similar requires --member or a member name argument.');
    return ok({ similarMembers: summarizeSimilarMembers(profiles, year, support, member, options) });
  }

  if (name === 'preset') {
    const presetId = options._[1];
    if (!presetId || !PRESETS[presetId]) {
      return ok({ presets: PRESETS, note: 'Run preset <id> to execute it.' });
    }
    return runCommand('crosstab', { ...options, ...PRESETS[presetId] }, ctx);
  }

  throw new Error(`Unknown command: ${name}. Run "help" for usage.`);
}

function createContext(options) {
  const dataDir = path.resolve(options['data-dir'] || path.join(repoRoot, 'data', 'survey'));
  const memberPath = path.resolve(options['members-file'] || path.join(repoRoot, 'data', MEMBER_FILE));
  const baseUrl = options['base-url'] ? normalizeBaseUrl(options['base-url']) : null;
  return { dataDir, memberPath, baseUrl };
}

async function loadSurveyJson(ctx, key) {
  const file = SURVEY_FILES[key];
  if (!file) throw new Error(`Unknown survey file key: ${key}`);
  return loadJson(ctx, file, { survey: true });
}

async function loadAggregate(ctx, year) {
  if (String(year) === '2025') return loadSurveyJson(ctx, 'aggregate2025');
  if (String(year) === '2026') return loadSurveyJson(ctx, 'aggregate2026');
  throw new Error(`Unsupported year: ${year}`);
}

async function loadJson(ctx, file, { survey }) {
  if (ctx.baseUrl) {
    const url = survey ? new URL(file, ctx.baseUrl) : new URL(`../${file}`, ctx.baseUrl);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url.href}: ${response.status}`);
    return response.json();
  }
  const filePath = survey ? path.join(ctx.dataDir, file) : ctx.memberPath;
  const body = await fs.readFile(filePath, 'utf8');
  return JSON.parse(body);
}

function summarizeCatalog(catalog) {
  return {
    generatedAt: catalog.generatedAt,
    questions: catalog.questions?.length || 0,
    dimensions: catalog.dimensions?.length || 0,
    metrics: catalog.metrics?.length || 0,
    crosstabs: catalog.crosstabs?.length || 0,
    flows: catalog.flows?.length || 0,
    networks: catalog.networks?.length || 0,
    keywordQuestions: catalog.keywordQuestions?.length || 0,
    memberProfiles: catalog.memberProfiles ? true : false,
    privacy: catalog.privacy,
  };
}

function filterCatalog(catalog, options) {
  const section = options.section || options._[1];
  if (!section) return catalog;
  if (!catalog[section]) throw new Error(`Catalog section not found: ${section}`);
  return { [section]: catalog[section] };
}

function findCatalog(catalog, query, top) {
  const needle = query.toLowerCase();
  const collections = [
    ['question', catalog.questions || []],
    ['dimension', catalog.dimensions || []],
    ['metric', catalog.metrics || []],
    ['crosstab', catalog.crosstabs || []],
    ['flow', catalog.flows || []],
    ['network', catalog.networks || []],
    ['keyword', catalog.keywordQuestions || []],
    ['memberProfileSignal', catalog.memberProfiles?.signals || []],
    ['memberProfileSupport', Object.values(catalog.memberProfiles?.supportTypes || {}).flat()],
  ];
  const results = [];
  collections.forEach(([type, items]) => {
    items.forEach((item) => {
      const haystack = JSON.stringify(item).toLowerCase();
      if (haystack.includes(needle)) {
        results.push({ type, ...item });
      }
    });
  });
  return results.slice(0, top);
}

function trimQuestion(question, top) {
  const result = { ...question.result };
  if (Array.isArray(result.counts)) result.counts = result.counts.slice(0, top);
  if (Array.isArray(result.items)) result.items = result.items.slice(0, top);
  if (Array.isArray(result.samples)) delete result.samples;
  return { ...question, result };
}

function summarizeCrosstab(table, options) {
  const mode = options.mode || 'lift';
  const rowFilter = options.row;
  const colFilter = options.col || options.column;
  const top = Number(options.top || 12);
  const cells = [];
  (table.rows || []).forEach((row) => {
    if (rowFilter && !includesText(row.label, rowFilter)) return;
    (row.cells || []).forEach((cell) => {
      if (cell.suppressed) return;
      if (colFilter && !includesText(cell.label, colFilter)) return;
      cells.push({
        row: row.label,
        column: cell.label,
        base: row.base,
        count: cell.count,
        rate: cell.rate,
        lift: cell.lift,
      });
    });
  });
  cells.sort((a, b) => {
    const av = mode === 'count' ? a.count : mode === 'rate' ? a.rate : Math.abs(a.lift || 0);
    const bv = mode === 'count' ? b.count : mode === 'rate' ? b.rate : Math.abs(b.lift || 0);
    return bv - av;
  });
  return {
    year: table.year,
    dimensionId: table.dimensionId,
    dimensionLabel: table.dimensionLabel,
    metricId: table.metricId,
    metricLabel: table.metricLabel,
    base: table.base,
    minCellSize: table.minCellSize,
    mode,
    cells: cells.slice(0, top),
    notes: ['Small cells are suppressed in the source aggregate.', 'Lift is group rate minus overall rate.'],
  };
}

function filterInsights(items, options) {
  const top = Number(options.top || 10);
  const theme = options.theme;
  const year = options.year ? String(options.year) : null;
  return items
    .filter((item) => !year || String(item.year) === year)
    .filter((item) => !theme || insightInTheme(item, theme))
    .slice(0, top);
}

function insightInTheme(item, theme) {
  const metrics = INSIGHT_THEMES[theme];
  if (!metrics) throw new Error(`Unknown insight theme: ${theme}`);
  return metrics.includes(item.metricId) || metrics.includes(item.dimensionId);
}

function summarizeFlow(flow, options) {
  const source = options.source;
  const target = options.target;
  const links = (flow.links || [])
    .filter((item) => !source || includesText(item.source, source))
    .filter((item) => !target || includesText(item.target, target))
    .slice(0, Number(options.top || 20));
  return {
    ...pick(flow, ['id', 'year', 'label', 'description', 'sourceLabel', 'targetLabel', 'base']),
    sources: (flow.sources || []).slice(0, 12),
    targets: (flow.targets || []).slice(0, 12),
    links,
  };
}

function summarizeNetwork(network, options) {
  const focus = options.focus;
  const edges = (network.edges || [])
    .filter((item) => !focus || includesText(item.source, focus) || includesText(item.target, focus))
    .slice(0, Number(options.top || 20));
  return {
    ...pick(network, ['id', 'year', 'label', 'description', 'questionId', 'base']),
    focus: focus || null,
    nodes: (network.nodes || []).slice(0, 30),
    edges,
  };
}

function defaultMemberSupport(year) {
  return String(year) === '2025' ? 'ranked' : 'favorite';
}

function listMemberProfiles(profiles, year, support, options) {
  const top = Number(options.top || 20);
  const supportType = (profiles.supportTypes?.[year] || []).find((item) => item.id === support);
  if (!supportType) throw new Error(`Support type not found: year=${year}, support=${support}`);
  const members = Object.values(profiles.years[year].members || {})
    .map((member) => ({
      member: member.name,
      gen: member.gen,
      status: member.status,
      count: member.supports?.[support]?.count || 0,
      rate: member.supports?.[support]?.rate || 0,
      reliability: member.supports?.[support]?.reliability || 'none',
    }))
    .filter((member) => member.count > 0)
    .sort((a, b) => (b.count - a.count) || String(a.member).localeCompare(String(b.member)))
    .slice(0, top);
  return {
    year,
    support,
    supportLabel: supportType.label,
    minSupport: profiles._meta?.minSupport,
    members,
  };
}

function summarizeMemberProfile(profiles, year, support, memberName, options) {
  const yearData = profiles.years[year];
  const supportType = (profiles.supportTypes?.[year] || []).find((item) => item.id === support);
  if (!supportType) throw new Error(`Support type not found: year=${year}, support=${support}`);
  const member = findMemberProfile(yearData.members || {}, memberName);
  if (!member) throw new Error(`Member profile not found: year=${year}, member=${memberName}`);
  const supportInfo = member.supports?.[support];
  if (!supportInfo) throw new Error(`No support data for member=${member.name}, support=${support}`);
  const profile = member.profiles?.[support] || {};
  const top = Number(options.top || 8);
  const dimensions = Object.fromEntries(Object.entries(profile.dimensions || {}).map(([key, value]) => [
    key,
    {
      ...pick(value, ['id', 'label', 'groupId', 'base', 'overallBase']),
      items: (value.items || []).slice(0, top),
    },
  ]));
  return {
    year,
    member: member.name,
    gen: member.gen,
    status: member.status,
    support,
    supportLabel: supportType.label,
    supportDescription: supportType.description,
    supportInfo,
    sampleStatus: profile.sampleStatus || supportInfo.reliability,
    note: profile.note || profiles._meta?.privacy,
    highlights: (profile.highlights || []).slice(0, top),
    dimensions,
    affinities: (profile.affinities || []).slice(0, Number(options.affinities || top)),
  };
}

function summarizeSimilarMembers(profiles, year, support, memberName, options) {
  const yearData = profiles.years?.[year];
  if (!yearData) throw new Error(`Member profiles not found for year=${year}.`);
  const supportType = (profiles.supportTypes?.[year] || []).find((item) => item.id === support);
  if (!supportType) throw new Error(`Support type not found: year=${year}, support=${support}`);
  const member = findMemberProfile(yearData.members || {}, memberName);
  if (!member) throw new Error(`Member profile not found: year=${year}, member=${memberName}`);
  const profile = member.profiles?.[support];
  if (!profile || profile.sampleStatus !== 'ok') throw new Error(`Member profile has insufficient sample: ${member.name}, support=${support}`);
  const baseVector = profileVector(profile);
  const rows = Object.values(yearData.members || {})
    .filter((candidate) => candidate.name !== member.name)
    .map((candidate) => {
      const candidateProfile = candidate.profiles?.[support];
      if (!candidateProfile || candidateProfile.sampleStatus !== 'ok') return null;
      return {
        member: candidate.name,
        gen: candidate.gen,
        count: candidate.supports?.[support]?.count || 0,
        supportRate: candidate.supports?.[support]?.rate || 0,
        similarity: round(cosine(baseVector, profileVector(candidateProfile)), 4),
      };
    })
    .filter(Boolean)
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || b.count - a.count)
    .slice(0, Number(options.top || 10));
  return {
    year,
    support,
    supportLabel: supportType.label,
    member: member.name,
    method: 'cosine similarity over public member-profile dimension rates',
    rows,
  };
}

function profileVector(profile) {
  const vector = new Map();
  Object.values(profile.dimensions || {}).forEach((dimension) => {
    (dimension.items || []).forEach((item) => {
      vector.set(`${dimension.id}::${item.label}`, item.rate || 0);
    });
  });
  return vector;
}

function cosine(left, right) {
  const keys = new Set([...left.keys(), ...right.keys()]);
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  keys.forEach((key) => {
    const a = left.get(key) || 0;
    const b = right.get(key) || 0;
    dot += a * b;
    leftNorm += a * a;
    rightNorm += b * b;
  });
  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function findMemberProfile(members, query) {
  if (members[query]) return members[query];
  const found = Object.values(members).find((member) => includesText(member.name, query));
  return found || null;
}

function ok(payload) {
  return {
    ok: true,
    source: 'public-aggregate',
    privacy: {
      rawResponses: false,
      rawFreeText: false,
      privateRows: false,
    },
    ...payload,
  };
}

function output(payload, options) {
  const format = options.format || 'json';
  if (format === 'json') {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  if (format === 'md') {
    console.log(toMarkdown(payload));
    return;
  }
  if (format === 'table') {
    console.log(toTable(payload));
    return;
  }
  throw new Error(`Unsupported format: ${format}`);
}

function toMarkdown(payload) {
  if (!payload.ok) return `# Error\n\n${payload.error}`;
  return `# Survey BI CLI Result\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

function toTable(payload) {
  const rows = payload.results || payload.table?.cells || payload.insights || payload.memberProfiles?.members || payload.memberProfile?.highlights || payload.similarMembers?.rows || payload.question?.keywords || payload.question?.result?.counts || payload.flow?.links || payload.network?.edges || [];
  if (!Array.isArray(rows) || !rows.length) return JSON.stringify(payload, null, 2);
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const widths = columns.map((key) => Math.max(key.length, ...rows.map((row) => cellText(row[key]).length)));
  const line = columns.map((key, i) => key.padEnd(widths[i])).join('  ');
  const sep = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = rows.map((row) => columns.map((key, i) => cellText(row[key]).padEnd(widths[i])).join('  ')).join('\n');
  return `${line}\n${sep}\n${body}`;
}

function cellText(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function outputHelp() {
  console.log(`Survey BI agent CLI

Usage:
  node cli/survey-bi.mjs meta
  node cli/survey-bi.mjs catalog [section]
  node cli/survey-bi.mjs find <text>
  node cli/survey-bi.mjs question <questionId> [--top 20]
  node cli/survey-bi.mjs crosstab --year 2026 --x japanese_level --y ticket_issues [--mode lift|rate|count]
  node cli/survey-bi.mjs insights [--theme ticket] [--year 2026]
  node cli/survey-bi.mjs keywords <questionId>
  node cli/survey-bi.mjs flow --year 2026 --id era_to_activity [--source text] [--target text]
  node cli/survey-bi.mjs network --year 2026 --id favorite_members [--focus text]
  node cli/survey-bi.mjs member-profile --year 2026 --member 藤吉夏鈴 [--support favorite]
  node cli/survey-bi.mjs member-similar --year 2026 --member 藤吉夏鈴 [--support favorite]
  node cli/survey-bi.mjs preset <presetId>

Global options:
  --format json|md|table
  --data-dir <path>
  --base-url <url>     Example: https://www.kagenare.com/data/survey/

Privacy:
  This CLI reads public aggregate JSON only. It never reads survey-private/, raw xlsx/docx files, or raw free-text answers.
`);
}

function parseArgs(argv) {
  const parsed = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      parsed._.push(token);
      continue;
    }
    const eq = token.indexOf('=');
    if (eq > -1) {
      parsed[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      parsed[key] = next;
      i += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function inferYear(value) {
  const match = String(value).match(/20(25|26)/);
  if (!match) throw new Error(`Cannot infer year from: ${value}`);
  return `20${match[1]}`;
}

function includesText(value, query) {
  return String(value).toLowerCase().includes(String(query).toLowerCase());
}

function normalizeBaseUrl(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]).filter(([, value]) => value !== undefined));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
