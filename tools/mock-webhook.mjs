#!/usr/bin/env node
/**
 * 本地联调用的假 webhook（仅监听 127.0.0.1，不联网）。
 *   node tools/mock-webhook.mjs          → http://127.0.0.1:8799/ok   返回 200
 *                                          http://127.0.0.1:8799/fail 返回 500
 * 收到的内容会打印在终端，方便核对转发字段。请只用测试数据。
 */
import { createServer } from 'node:http';
createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const fail = req.url.startsWith('/fail');
    console.log(`[mock-webhook] ${req.method} ${req.url} -> ${fail ? 500 : 200}\n${body}\n`);
    res.writeHead(fail ? 500 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: !fail }));
  });
}).listen(8799, '127.0.0.1', () => console.log('mock webhook on http://127.0.0.1:8799  (/ok 成功, /fail 失败)'));
