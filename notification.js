'use strict';

const messages = require('./messages');

// 通知メッセージ/Slack payload を組み立てる関数群。
// Discord/Slackに接続しないので、単体でテストしやすい。
// （pickTemplate は Math.random を使うため、厳密には純粋ではない）

const LARGE_GROUP_THRESHOLD = 5;

// count/previousCountから、どの文言カテゴリ(messages.jsのキー)を使うか決める
function pickCategory(count, previousCount) {
  if (count === 0) return 'empty';
  if (previousCount === 0 && count === 1) return 'firstJoin';
  if (count >= LARGE_GROUP_THRESHOLD) return 'large';
  return 'small';
}

// カテゴリ内の文言からランダムに1つ選ぶ。{names}を含む文言は名前が無い時は除外する
function pickTemplate(category, hasNames) {
  const templates = messages[category] || [];
  const withoutNames = templates.filter(t => !t.includes('{names}'));
  const pool = hasNames && templates.length > 0 ? templates : withoutNames;
  const usable = pool.length > 0 ? pool : withoutNames;
  if (usable.length === 0) return null;
  return usable[Math.floor(Math.random() * usable.length)];
}

// count: 在室人数
// previousCount: 変化前の人数。不明な場合はnull（起動直後など）
// memberNames: 在室メンバーの表示名の配列。取得できない/空なら[]（人数のみにフォールバック）
function buildNotificationText({ count, previousCount = null, memberNames = [] }) {
  const hasNames = memberNames.length > 0;
  const namesText = memberNames.join('、');
  const category = pickCategory(count, previousCount);
  const template = pickTemplate(category, hasNames);

  if (!template) {
    return hasNames
      ? `ボイチャに${count}人居ます: ${namesText}`
      : `ボイチャに${count}人居ます`;
  }

  return template.replace(/\{count\}/g, String(count)).replace(/\{names\}/g, namesText);
}

// text: Slack通知本文（プレーンテキスト。ブロック未対応クライアントやフォールバック表示に使われる）
// members: [{ name, avatarUrl }] 在室メンバー。avatarUrlが無いメンバーはアイコン表示から除外される
function buildSlackPayload({ text, members = [] }) {
  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text } }];

  // Block Kitのcontext要素は最大10個までなので超過分は表示しない
  const avatarElements = members
    .filter(m => m.avatarUrl)
    .slice(0, 10)
    .map(m => ({ type: 'image', image_url: m.avatarUrl, alt_text: m.name || 'メンバー' }));

  if (avatarElements.length > 0) {
    blocks.push({ type: 'context', elements: avatarElements });
  }

  return { text, blocks };
}

// webhookUrlにpayloadをPOSTする（副作用あり）。テストではこの関数自体を呼ばずにモックする。
async function sendToSlack(webhookUrl, payload) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

module.exports = { buildNotificationText, buildSlackPayload, sendToSlack, pickCategory };
