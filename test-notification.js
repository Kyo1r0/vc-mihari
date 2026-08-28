'use strict';

// notification.js の純粋関数に対する自己テスト。
// ネットワークには一切接続しない。 実行: node test-notification.js

const { buildNotificationText, buildSlackPayload, pickCategory } = require('./notification');
const messages = require('./messages');

let failed = 0;

// buildNotificationTextは文言をランダムに選ぶため、期待する「候補プール」の
// いずれかに一致するかを検証する（messages.js自体を使って期待値を再現する）。
function fillTemplate(template, count, namesText) {
  return template.replace(/\{count\}/g, String(count)).replace(/\{names\}/g, namesText);
}

function expectedPool(category, count, memberNames) {
  const hasNames = memberNames.length > 0;
  const templates = messages[category] || [];
  const withoutNames = templates.filter(t => !t.includes('{names}'));
  const pool = hasNames && templates.length > 0 ? templates : withoutNames;
  const usable = pool.length > 0 ? pool : withoutNames;
  const namesText = memberNames.join('、');
  return usable.map(t => fillTemplate(t, count, namesText));
}

const cases = [
  {
    name: '在室0人',
    input: { count: 0, previousCount: 1, memberNames: [] },
    expectedCategory: 'empty',
  },
  {
    name: '誰もいなかったところに最初の1人',
    input: { count: 1, previousCount: 0, memberNames: ['ありす'] },
    expectedCategory: 'firstJoin',
  },
  {
    name: '在室複数人（名前あり、少人数）',
    input: { count: 3, previousCount: 2, memberNames: ['ありす', 'ぼぶ', 'きゃろる'] },
    expectedCategory: 'small',
  },
  {
    name: '大人数（5人以上）',
    input: { count: 6, previousCount: 5, memberNames: ['a', 'b', 'c', 'd', 'e', 'f'] },
    expectedCategory: 'large',
  },
  {
    name: '名前が取得できない場合のフォールバック',
    input: { count: 2, previousCount: 1, memberNames: [] },
    expectedCategory: 'small',
  },
];

for (const c of cases) {
  const actualCategory = pickCategory(c.input.count, c.input.previousCount);
  const pool = expectedPool(c.expectedCategory, c.input.count, c.input.memberNames);

  // ランダム選択が常に期待プール内に収まっているか複数回試す
  let ok = actualCategory === c.expectedCategory;
  let lastActual = null;
  for (let i = 0; i < 30 && ok; i++) {
    lastActual = buildNotificationText(c.input);
    ok = pool.includes(lastActual);
  }

  if (!ok) failed++;
  console.log(`[${ok ? 'OK' : 'NG'}] ${c.name}: "${lastActual}" (category=${actualCategory})`);
}

// buildSlackPayload: ネットワークには接続せず、組み立てたJSONをそのままログに残す
const payloadCases = [
  {
    name: 'アバターURLありのメンバー2人',
    input: {
      text: 'ボイチャに2人居ます: A, B',
      members: [
        { name: 'A', avatarUrl: 'https://example.com/a.png' },
        { name: 'B', avatarUrl: 'https://example.com/b.png' },
      ],
    },
    check: (payload) =>
      payload.text === 'ボイチャに2人居ます: A, B' &&
      payload.blocks[0].type === 'section' &&
      payload.blocks[1].type === 'context' &&
      payload.blocks[1].elements.length === 2,
  },
  {
    name: 'アバターURLが無い場合はcontextブロックを付けない',
    input: {
      text: 'ボイチャに1人居ます',
      members: [{ name: 'A', avatarUrl: undefined }],
    },
    check: (payload) => payload.text === 'ボイチャに1人居ます' && payload.blocks.length === 1,
  },
];

for (const c of payloadCases) {
  const payload = buildSlackPayload(c.input);
  const ok = c.check(payload);
  if (!ok) failed++;
  console.log(`[${ok ? 'OK' : 'NG'}] ${c.name}: ${JSON.stringify(payload)}`);
}

if (failed > 0) {
  console.error(`${failed}件のテストが失敗しました`);
  process.exit(1);
}
console.log('全テスト成功');
