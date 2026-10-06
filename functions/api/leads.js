/**
 * Cloudflare Pages Function — POST /api/leads
 * 接收首页咨询表单与招聘页应聘表单，校验后转发到环境变量 LEADS_WEBHOOK_URL 指向的 webhook。
 *
 * 环境变量（在 Cloudflare Pages → Settings → Environment variables 中配置，勿写入仓库）：
 *   LEADS_WEBHOOK_URL     必填。https webhook 地址，建议设为 Secret（加密）。
 *   LEADS_WEBHOOK_FORMAT  选填。json（默认）| wecom（企业微信群机器人）| feishu | dingtalk。
 *                         未设置时按 webhook 域名自动识别。
 *
 * 响应约定（JSON）：
 *   200 {ok:true}                               webhook 已确认接收
 *   400 {ok:false,error:"validation",fields}    字段校验失败
 *   400 {ok:false,error:"too_fast"|"bad_request"}
 *   403 {ok:false,error:"forbidden"}            跨站来源
 *   502 {ok:false,error:"upstream"}             webhook 未确认接收
 *   503 {ok:false,error:"not_configured"}       未配置 LEADS_WEBHOOK_URL
 * GET /api/leads 返回 {enabled:boolean}，供前端判断是否启用在线提交（不泄露 webhook 地址）。
 *
 * 隐私：不记录、不转发访客 IP；不在日志中输出姓名、手机号等个人信息。
 */

const MAX_BODY_BYTES = 8 * 1024;
const MIN_FILL_MS = 3000;
const PHONE_RE = /^1[3-9]\d{9}$/;
const SITE_TEL = '158 5030 1819';
const SITE_WECHAT = 'yikangcare';

const SERVICES = ['医院陪护', '住家老人护理', '保洁服务', '交通事故理赔协助', '应聘护工/保洁', '其他咨询'];
const POSITIONS = ['医院护工（陪护人员）', '保洁人员', '两者均可'];
const EXPERIENCES = ['无相关经验', '有护理/陪护经验（1年以内）', '有护理/陪护经验（1–3年）', '有护理/陪护经验（3年以上）', '有保洁工作经验'];
const AVAILABILITIES = ['随时可上岗', '3天内可上岗', '1周内可上岗', '1个月内可上岗'];

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 无 JS 时表单直接 POST 的回退页面：如实展示结果 */
function htmlPage(status, title, message) {
  const body = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="robots" content="noindex"><title>${escapeHtml(title)} | 昆山益康家政</title><link rel="stylesheet" href="/assets/site.css"></head><body><main class="wrap doc" style="padding:48px 0"><div class="article-body"><h1 class="sec-title">${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p>电话：<a class="text-link" href="tel:15850301819">${SITE_TEL}</a>　微信号：${SITE_WECHAT}</p><p><a class="btn btn-p" href="/">返回首页</a></p></div></main></body></html>`;
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

const clean = (v, max) =>
  String(v == null ? '' : v)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

const normalizePhone = (v) => String(v || '').replace(/[\s\-()（）]/g, '').replace(/^(\+?86|0086)/, '');

const isTrue = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 'yes';

function sameOrigin(request) {
  const host = new URL(request.url).host;
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  try {
    if (origin) return new URL(origin).host === host;
    if (referer) return new URL(referer).host === host;
  } catch (e) {
    return false;
  }
  return false; // 浏览器表单提交必带 Origin 或 Referer；两者皆无视为非浏览器请求
}

function validate(input) {
  const fields = {};
  const formType = input.form_type === 'recruit' ? 'recruit' : 'inquiry';
  const out = { form_type: formType };

  out.name = clean(input.name, 40);
  if (out.name.length < 1 || out.name.length > 20) fields.name = '请填写称呼（20 字以内）';

  out.phone = normalizePhone(clean(input.phone, 24));
  if (!PHONE_RE.test(out.phone)) fields.phone = '请填写 11 位中国大陆手机号';

  if (!isTrue(input.consent)) fields.consent = '请先阅读并勾选同意隐私说明';

  const urlCount = (s) => (s.match(/https?:\/\/|www\./gi) || []).length;

  if (formType === 'inquiry') {
    out.service = clean(input.service, 30);
    if (!SERVICES.includes(out.service)) fields.service = '请选择咨询项目';
    out.message = clean(input.message, 600);
    if (String(input.message || '').trim().length > 500) fields.message = '需求描述请控制在 500 字以内';
    else if (urlCount(out.message) > 1) fields.message = '需求描述中请不要包含多个网址';
  } else {
    out.position = clean(input.position, 30);
    if (!POSITIONS.includes(out.position)) fields.position = '请选择应聘岗位';
    out.experience = clean(input.experience, 40);
    if (!EXPERIENCES.includes(out.experience)) fields.experience = '请选择工作经验';
    out.availability = clean(input.availability, 30);
    if (!AVAILABILITIES.includes(out.availability)) fields.availability = '请选择可上岗时间';
    const age = clean(input.age, 3);
    if (age !== '') {
      if (/^\d{1,2}$/.test(age) && +age >= 18 && +age <= 60) out.age = +age;
      else fields.age = '年龄请填写 18–60 之间的数字，或留空';
    }
    out.note = clean(input.note, 600);
    if (String(input.note || '').trim().length > 500) fields.note = '补充说明请控制在 500 字以内';
    else if (urlCount(out.note) > 1) fields.note = '补充说明中请不要包含多个网址';
  }

  out.page = clean(input.page, 100).replace(/[^\w\-./]/g, '');
  return { ok: Object.keys(fields).length === 0, fields, lead: out };
}

function summarize(lead, submittedAt) {
  const time = new Date(submittedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const lines =
    lead.form_type === 'recruit'
      ? [
          '【益康家政官网 · 应聘申请】',
          `姓名：${lead.name}`,
          `手机：${lead.phone}`,
          `应聘岗位：${lead.position}`,
          `工作经验：${lead.experience}`,
          `可上岗时间：${lead.availability}`,
          `年龄：${lead.age ?? '未填写'}`,
          `补充说明：${lead.note || '无'}`,
        ]
      : [
          '【益康家政官网 · 服务咨询】',
          `称呼：${lead.name}`,
          `手机：${lead.phone}`,
          `咨询项目：${lead.service}`,
          `需求描述：${lead.message || '无'}`,
        ];
  lines.push(`提交时间：${time}`, `来源页面：${lead.page || '/'}`);
  return lines.join('\n');
}

function detectFormat(url, explicit) {
  const f = String(explicit || '').toLowerCase();
  if (['json', 'wecom', 'feishu', 'dingtalk'].includes(f)) return f;
  const host = url.hostname;
  if (host === 'qyapi.weixin.qq.com') return 'wecom';
  if (host === 'open.feishu.cn' || host === 'open.larksuite.com') return 'feishu';
  if (host === 'oapi.dingtalk.com') return 'dingtalk';
  return 'json';
}

function buildPayload(format, lead, text, submittedAt) {
  switch (format) {
    case 'wecom':
    case 'dingtalk':
      return { msgtype: 'text', text: { content: text } };
    case 'feishu':
      return { msg_type: 'text', content: { text } };
    default:
      return { source: 'yikangcare.com', submitted_at: submittedAt, text, lead };
  }
}

/** webhook 是否明确确认接收。企业微信/钉钉/飞书在 HTTP 200 时也可能返回业务错误码。 */
async function upstreamAccepted(res, format) {
  if (!res.ok) return false;
  if (format === 'json') return true;
  try {
    const data = await res.json();
    if (format === 'feishu') return data.code === 0 || data.StatusCode === 0;
    return data.errcode === 0;
  } catch (e) {
    return false;
  }
}

function webhookUrl(env) {
  const raw = env && typeof env.LEADS_WEBHOOK_URL === 'string' ? env.LEADS_WEBHOOK_URL.trim() : '';
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:') return url;
    // 仅本地联调允许 http://localhost 或 http://127.0.0.1
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return url.protocol === 'http:' && local ? url : null;
  } catch (e) {
    return null;
  }
}

export async function onRequestGet({ env }) {
  return json(200, { enabled: webhookUrl(env) !== null });
}

export async function onRequestPost({ request, env }) {
  const contentType = (request.headers.get('Content-Type') || '').toLowerCase();
  const isJson = contentType.includes('application/json');
  const isForm = contentType.includes('application/x-www-form-urlencoded');
  const reply = (status, body, title, message) => (isJson ? json(status, body) : htmlPage(status, title, message));
  const contactHint = `请拨打 ${SITE_TEL} 或添加微信 ${SITE_WECHAT} 联系我们。`;

  if (!isJson && !isForm) return json(400, { ok: false, error: 'bad_request' });
  if (!sameOrigin(request)) return reply(403, { ok: false, error: 'forbidden' }, '提交未成功', `请求来源无效，您的信息没有送达。${contactHint}`);

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES) return reply(400, { ok: false, error: 'bad_request' }, '提交未成功', `提交内容过长，您的信息没有送达。${contactHint}`);

  let input;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) throw new Error('too large');
    input = isJson ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('bad shape');
  } catch (e) {
    return reply(400, { ok: false, error: 'bad_request' }, '提交未成功', `提交内容无法识别，您的信息没有送达。${contactHint}`);
  }

  const url = webhookUrl(env);
  if (!url) {
    return reply(503, { ok: false, error: 'not_configured' }, '在线提交暂未启用', '在线提交暂未启用，请拨打电话或复制微信号。您的信息没有送达。');
  }

  // 基础反垃圾：蜜罐字段（真人看不到，机器人常会填写）与过快提交
  if (clean(input.website, 200) !== '') {
    return reply(400, { ok: false, error: 'bad_request' }, '提交未成功', `您的信息没有送达。${contactHint}`);
  }
  if (isJson && !(Number(input.elapsed_ms) >= MIN_FILL_MS)) {
    return json(400, { ok: false, error: 'too_fast' });
  }

  const result = validate(input);
  if (!result.ok) {
    return reply(400, { ok: false, error: 'validation', fields: result.fields }, '提交未成功', `${Object.values(result.fields).join('；')}。请返回上一页修改后重试，或${contactHint}`);
  }

  const submittedAt = new Date().toISOString();
  const format = detectFormat(url, env.LEADS_WEBHOOK_FORMAT);
  const payload = buildPayload(format, result.lead, summarize(result.lead, submittedAt), submittedAt);

  let accepted = false;
  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    accepted = await upstreamAccepted(res, format);
    if (!accepted) console.error(`leads webhook rejected: status=${res.status} format=${format}`);
  } catch (e) {
    console.error(`leads webhook failed: ${e && e.name}`);
  }

  if (!accepted) {
    return reply(502, { ok: false, error: 'upstream' }, '提交未成功', `系统暂时无法送达您的信息。${contactHint}`);
  }
  return reply(
    200,
    { ok: true },
    '提交成功',
    result.lead.form_type === 'recruit' ? '应聘申请已送达，我们会尽快与您联系。' : '咨询信息已送达，我们会尽快与您联系。'
  );
}

/** 其他方法一律拒绝 */
export async function onRequest() {
  return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'GET, POST' },
  });
}
