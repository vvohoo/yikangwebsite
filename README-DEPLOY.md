# 部署与上线说明（昆山益康家政官网）

静态站 + 一个 Cloudflare Pages Function，无构建步骤。仓库根目录即发布目录。

```
assets/site.css, site.js   全站共享样式与脚本
functions/api/leads.js     表单后端（Pages Function）：校验 → 转发到 webhook
partials/header|footer     页头/页脚模板，改完运行 node tools/sync-partials.mjs 同步到所有页面
tools/mock-webhook.mjs     本地联调用的假 webhook
```

网址说明：Cloudflare Pages 会把 `/xxx.html` 308 跳转到 `/xxx`、`/blog/index.html` 跳到 `/blog/`。
因此站内链接、canonical、sitemap 均已使用最终网址（无 `.html`）。本地预览请用下文的 wrangler，
不要用 `python -m http.server`（它不认识无后缀网址，也没有表单接口）。

改了 `assets/` 下的文件后，请把所有页面里 `site.css?v=…`、`site.js?v=…` 的版本号一起改掉
（全局替换即可），否则访客浏览器最长会缓存旧文件 1 天。

---

## 1. 配置 LEADS_WEBHOOK_URL

表单提交后，后端把内容 POST 到这个地址。**不要把地址写进任何代码或提交到仓库。**

1. 准备一个接收消息的 webhook，任选其一：
   - 企业微信群机器人（群设置 → 添加群机器人 → 复制 Webhook 地址）
   - 飞书 / 钉钉群自定义机器人（钉钉的安全设置请选“自定义关键词”，关键词填 `益康家政官网`）
   - 任何能接收 JSON 的 https 地址（自建服务、表单/自动化平台等）
2. Cloudflare 控制台 → Workers & Pages → 本项目 → Settings → Variables and Secrets：
   - 添加 `LEADS_WEBHOOK_URL`，类型选 **Secret**，值为上一步的地址（必须是 https）。
   - Production 环境必须配；Preview 环境建议配一个单独的测试群，或者不配。
   - （可选）`LEADS_WEBHOOK_FORMAT`：`json` | `wecom` | `feishu` | `dingtalk`。
     不填时按域名自动识别企业微信、飞书、钉钉；其他地址一律发送通用 JSON：
     `{ source, submitted_at, text, lead:{ form_type, name, phone, … } }`
3. 保存后**重新部署一次**（环境变量只对新部署生效）。
4. 验证：浏览器打开 `https://yikangcare.com/api/leads`，应看到 `{"enabled":true}`。

未配置时的表现（已实测）：接口返回 `{"enabled":false}`，两个表单的提交按钮禁用并显示
“在线提交暂未启用，请拨打电话或复制微信号”，不会出现任何“提交成功”。

后端已做的防护：同源校验、8KB 请求体上限、字段白名单与长度限制、中国大陆手机号校验、
必须勾选隐私同意、蜜罐字段、3 秒内提交拦截、需求描述中多个网址拦截。
代码里**没有**按 IP 限流，这一层必须由下面的 WAF 规则补上。

### 上线前必做：给 /api/leads 配 WAF 限流

没有这条规则，任何人都可以用脚本反复提交，把接收线索的群刷屏。**这是上线的最低安全门槛，不是可选项。**

Cloudflare 控制台 → 选择域名 `yikangcare.com` → Security → WAF → Rate limiting rules → Create rule：

| 项目 | 填写 |
|---|---|
| Rule name | `leads-rate-limit` |
| If incoming requests match | `(http.request.uri.path eq "/api/leads" and http.request.method eq "POST")` |
| With the same characteristics | IP |
| When rate exceeds | **5** requests per **1 minute** |
| Then take action | Block，响应状态码 **429** |
| For duration | 1 minute（免费版可选的最短时长即可） |

要点：
- 只匹配 POST。页面加载时探测是否启用的 GET 请求不计入，否则正常访客多开几个页面就会被拦。
- 规则作用在自定义域名上；`*.pages.dev` 的默认域名不受它保护。上线后请在
  Pages → Custom domains 确认主域名已绑定，并在 Pages → Settings 里关闭或限制 `pages.dev` 的公开访问。
- 被限流时前端会显示“提交过于频繁，请稍后再试”，并给出电话和微信。
- 配好后自测：一分钟内连续提交 6 次，第 6 次应返回 429。

```bash
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code}\n" -X POST https://yikangcare.com/api/leads -H "Content-Type: application/json" -H "Origin: https://yikangcare.com" -d '{}'; done
```

前 5 次应为 400（空内容被接口拒绝，不会转发），第 6 次应为 429。

**Turnstile（人机验证）目前没有实现。** WAF 限流是当前唯一的频率防线。以后如果限流仍挡不住垃圾提交，
再加 Turnstile：Site Key 可以写在页面里，Secret Key 必须作为 Pages 的 Secret 环境变量
（例如 `TURNSTILE_SECRET_KEY`）由 `functions/api/leads.js` 在服务端校验，不能写进前端或仓库；
同时要在 `_headers` 的 CSP 里放行 `https://challenges.cloudflare.com`。即使接了 Turnstile，这条 WAF 规则也要保留。

## 2. 本地测试表单（成功 / 失败 / 手机号校验）

需要 Node.js 22 及以上（wrangler 的要求）。全部使用测试数据，不会联网。

```bash
node tools/mock-webhook.mjs
```

另开三个终端，分别对应三种状态：

```bash
npx wrangler pages dev . --port 8788
```

```bash
npx wrangler pages dev . --port 8789 --inspector-port 9230 --persist-to .wrangler/ok --binding LEADS_WEBHOOK_URL=http://127.0.0.1:8799/ok
```

```bash
npx wrangler pages dev . --port 8790 --inspector-port 9231 --persist-to .wrangler/fail --binding LEADS_WEBHOOK_URL=http://127.0.0.1:8799/fail
```

| 打开 | 操作 | 应看到 |
|---|---|---|
| `http://127.0.0.1:8788/#contact` | 无需操作 | 按钮禁用，提示“在线提交暂未启用，请拨打电话或复制微信号” |
| `http://127.0.0.1:8789/#contact` | 手机号填 `12345` 提交 | 手机号下方提示“请填写 11 位中国大陆手机号”，未发出请求 |
| 同上 | 不勾选同意框提交 | 提示“请先阅读并勾选同意隐私说明” |
| 同上 | 填 `13800138000`、勾选同意，停留 3 秒后提交 | 按钮先变“正在提交…”，随后绿色“提交成功…”；mock 终端打印收到的内容 |
| `http://127.0.0.1:8790/#contact` | 同样正确填写后提交 | 红色“提交未成功，您的信息没有送达”，并给出电话与复制微信号 |
| `http://127.0.0.1:8789/recruit#apply` | 重复以上步骤 | 招聘表单行为一致 |

也可以直接测接口（把 `phone` 改成 `12345` 应返回 400）：

```bash
curl -i -X POST http://127.0.0.1:8789/api/leads -H "Content-Type: application/json" -H "Origin: http://127.0.0.1:8789" -d '{"form_type":"inquiry","name":"测试","phone":"13800138000","service":"医院陪护","consent":true,"elapsed_ms":5000}'
```

`http://` 的 webhook 地址只在 `localhost` / `127.0.0.1` 下被接受，线上必须是 https。

## 3. 上线前需要人工确认的事实

网站上的这些内容我们无法代为核实，请负责人逐项确认；不属实的请改掉或删掉。

**微信与二维码**（2026-10-06 已由负责人确认可公开：名片正面二维码、名片背面品牌标识、程经理微信头像）
- [x] `image/wechat-cheng-manager-qr.png`：从 `yikangcare business card1.jpg` 提取的程经理个人微信二维码，
      已用 macOS 条码识别验证，内容与名片原图一致。展示在“加微信咨询”弹层和首页“联系我们”。
- [ ] 请用一部真实手机的微信扫一次线上页面里的二维码，确认能打开程经理的名片页。
- [ ] 微信号 `yikangcare` 能被搜索添加（微信“隐私 → 添加我的方式”里要开启微信号搜索），且“加我为朋友时需要验证”的设置符合预期。
- [ ] 个人微信二维码如果在微信里“重置二维码”，旧码立即失效——重置后必须换图（用新文件名）。
- [ ] 企业微信、视频号、小程序开通后，替换页面上的“筹备中”字样和“当前为个人微信”的说明。

**照片与肖像授权**
- [x] 程经理微信头像（`wechat-cheng-manager-avatar-192.*`）已确认可公开，仅在微信联系入口旁作身份说明使用。
- [ ] `image/ykhonor.jpg`、`Nursing1–3.jpg`、`workplace6.jpg`、`other1–4.jpg` 中有可辨认的患者、家属或工作人员。
      这些图片现在**全部未上屏**。取得当事人书面同意后才可使用。
- [ ] 首页与招聘页使用的团队合影（`ykteam.jpg` 及其压缩版）中的员工是否同意公开展示。
- [ ] 博客卡片使用的病区、护士站、走廊照片（`workplace1–3.jpg`）是否允许对外使用（院方对院内拍摄可能有规定）。
- [ ] `office-consultation.*`（办公室照片）中的人物是否同意公开展示。

**医院覆盖**
- [ ] 是否确实可进入昆山市第四、第五人民医院提供陪护；院方是否对外来护工有准入或备案要求。
      页面已统一写成“可前往服务”，并注明不代表与医院存在隶属或官方合作关系。若确有书面合作，可据实补充。

**价格**
- [ ] 24 小时陪护 260/240 元、12 小时 220/200 元、住家护理 4800 元/月起，是否仍是现行价格
      （页面写的是“2022年3月起执行”）。
- [ ] “不开票价”与“含税开票价”并列展示是否合适，请与财务或税务顾问确认。
- [ ] 招聘页的收入测算（180–200 元/人/天、保底工资、年终奖）是否属实。

**品牌标识**
- [ ] 新 Logo（`favicon-yikangcare.svg`、`image/yikangcare-brand-mark*.png`）是按名片背面右上角的图形**重新描绘**的矢量版
      （名片上的原图只有约 200 像素，无法直接放大使用）。请对照名片确认形状、颜色可接受；
      如有设计源文件（AI/PSD/SVG），请提供后替换，文件名加版本后缀。
- [ ] 网站文字品牌仍为“益康家政”，名片标识文字为“昆山益康护工 yikangcare”。是否需要统一，请决定。

**营业时间与公司信息**
- [ ] 办公室的到访时间。目前网站和结构化数据都**没有填写营业时间、地图坐标**，确认后再补。
- [ ] “24小时全年响应”“最快当天到岗”“17名持证护工”“岗前培训与背景核查”“替补护工机制”是否都能做到并拿得出证明。
- [ ] 营业执照、护工证件能否在客户要求时当面出示（网站承诺了“咨询或签约时可查验”）。
- [ ] ICP 备案号。大陆访客为主的网站通常需要备案并在页脚展示；取得后加到 `partials/footer.html`。

**隐私政策（privacy.html）**
- [ ] 第四条写的是“网站不保存数据，转发到公司内部工作消息渠道”——请确保 webhook 接收端确实只有负责接待的员工能看到。
- [ ] 网站托管在境外服务商 Cloudflare，政策里已如实说明。是否需要做个人信息出境方面的合规处理，请咨询法务。
- [ ] 留存期限目前写的是“实现目的所需的期限”，如公司有明确天数请改成具体数字。

**本次改动中的措辞调整（如不认可可改回）**
- “术后特护”改为“术后陪护”；“鼻胃管/导尿管护理配合”改为“留置管路期间的生活照料配合”，并写明医疗操作由医护人员完成。
- “服务家庭与机构客户超千次”改为“长期服务本地家庭与机构客户”（无法核实具体次数）。
- 所有“方便医保报销”改为“可按规定开具发票；是否可用于医保或单位报销，以当地政策及报销单位审核为准”。
- 招聘表单去掉了“性别”一项（岗位写明性别不限），年龄改为选填。
- 文章结构化数据里的发布日期原先全是 7 月 1 日，已改成与页面显示一致的日期。

## 4. 搜索、地图与评价（建议的工作流）

**域名**
- `https://www.yikangcare.com/` 目前返回 530 错误（2026-10-06 实测）。请在 Cloudflare 给 `www` 加 DNS 记录，
  并用 Redirect Rules 把 `www.yikangcare.com/*` 301 到 `https://yikangcare.com/$1`。这条规则不能写在 `_redirects` 里。

**站长平台**（验证码是 `<meta>` 标签或 DNS 记录，拿到后再加；旧页面里的占位标签已删除）
- 百度搜索资源平台：验证站点 → 提交 `https://yikangcare.com/sitemap.xml` → 每次发新文章用“普通收录”推送。
- Bing Webmaster Tools：验证 → 提交 sitemap。必应同时供给国内多个搜索入口。
- Google Search Console：建议用 DNS 方式验证整个域名 → 提交 sitemap → 关注“网页索引”里是否还有 `.html` 旧网址被标记为重定向（属正常，会逐步替换）。
- 360、搜狗站长平台按需验证。

**地图**
- 在高德开放平台“商户入驻”、百度地图“商户中心”、腾讯地图“商户标注”分别认领或新增
  “昆山市益康家政服务有限公司”，上传营业执照，电话填 158 5030 1819，地址与网站保持一字不差。
- 认领成功后，把网站“联系我们”里的三个地图**搜索链接**换成各平台的门店分享链接，
  再把真实营业时间和坐标补进首页的 LocalBusiness 结构化数据（`openingHours`、`geo`、`sameAs`）。

**真实评价**
- 只使用真实客户的评价。每单服务结束后由程经理征求客户意见，同意公开的，留存书面或微信截图同意记录。
- 上屏时隐去姓名（如“陆家镇 王女士家属”）、床号和病情细节；不代写、不修饰、不挑只好的改写。
- 评价积累到 5 条以上再在首页加“客户评价”区块；没有平台评分就不要展示星级。

**统计**
- 本站没有接入任何统计或追踪脚本。按钮和链接上预留了 `data-event` 属性
  （如 `call_hero`、`wechat_bottom_bar`、`wechat_copy`、`lead_submit_inquiry`、`map_amap`），目前不上报任何数据。
- 以后要接统计（建议优先 Cloudflare Web Analytics，无 Cookie）时：监听带 `data-event` 元素的点击即可；
  同时需要在 `_headers` 的 Content-Security-Policy 里放行对应脚本域名，并更新 `privacy.html`。

## 5. 日常维护速查

| 要做的事 | 怎么做 |
|---|---|
| 改电话、页脚、导航 | 改 `partials/` → `node tools/sync-partials.mjs`；电话还出现在各页正文、`assets/site.js` 顶部和 `functions/api/leads.js` 顶部 |
| 改样式或脚本 | 改 `assets/` → 全局替换 `?v=` 版本号 |
| 发新文章 | 复制一篇 `blog/*.html` 改内容 → 加到 `blog/index.html` 和 `sitemap.xml` → 填真实的发布/更新日期 |
| 换图片、换 Logo、换二维码 | 一律用新文件名（`/image/*` 设了一年缓存，覆盖旧文件名访客看不到更新），同时提供 `.webp` 和 `.jpg`/`.png` |
| 改了某个页面 | 把 `sitemap.xml` 里对应的 `lastmod` 改成当天日期 |
