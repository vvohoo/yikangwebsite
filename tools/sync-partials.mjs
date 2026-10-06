#!/usr/bin/env node
/**
 * 把 partials/header.html 与 partials/footer.html 同步进所有页面。
 * 无需构建工具：页面仍是完整静态 HTML，本脚本只替换两组标记之间的内容。
 *
 *   <!-- partial:header --> … <!-- /partial:header -->
 *   <!-- partial:footer --> … <!-- /partial:footer -->
 *
 * 用法：改完 partials/ 下的文件后运行  node tools/sync-partials.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [
  ...readdirSync(root).filter((f) => f.endsWith('.html')),
  ...readdirSync(join(root, 'blog')).filter((f) => f.endsWith('.html')).map((f) => join('blog', f)),
];
let changed = 0;
for (const name of ['header', 'footer']) {
  const partial = readFileSync(join(root, 'partials', `${name}.html`), 'utf8').trim();
  const re = new RegExp(`(<!-- partial:${name} -->)[\\s\\S]*?(<!-- /partial:${name} -->)`);
  for (const page of pages) {
    const file = join(root, page);
    const before = readFileSync(file, 'utf8');
    if (!re.test(before)) continue;
    const after = before.replace(re, (_, open, close) => `${open}\n${partial}\n${close}`);
    if (after !== before) {
      writeFileSync(file, after);
      changed++;
      console.log(`updated ${name}: ${page}`);
    }
  }
}
console.log(changed ? `done, ${changed} replacement(s)` : 'all pages already in sync');
