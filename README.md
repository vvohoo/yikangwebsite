# 昆山市益康家政服务有限公司官网

**域名：** https://yikangcare.com  
**部署：** Cloudflare Pages（GitHub push 即自动更新）  
**仓库：** vvohoo/yikangwebsite

---

## 文件结构

```
index.html              ← 官网首页（服务概览·资质·流程·联系）
hospital-care.html      ← 医院陪护详情页
home-care.html          ← 住家老人护理详情页
cleaning.html           ← 保洁服务详情页
insurance-assist.html   ← 交通事故伤残鉴定与理赔协助详情页
recruit.html            ← 招聘页面（护工·保洁招聘）
404.html                ← 自定义 404 页面
robots.txt              ← 搜索引擎爬虫规则
sitemap.xml             ← 站点地图
humans.txt              ← 站点作者信息
manifest.json           ← PWA / 移动端配置
favicon.svg             ← 网站图标
_redirects              ← Cloudflare Pages 重定向规则
_headers                ← Cloudflare Pages HTTP 响应头
image/                  ← 图片资源
```

## 服务区域

当前重点服务区域：

- **陆家镇**
- **千灯镇**
- **张浦镇**
- **花桥镇**
- 昆山开发区及周边

覆盖场所包括：昆山第四人民医院、昆山第五人民医院、张浦镇医院、花桥人民医院、周边养老院、护理院、企业办公室、工厂、住宅等。

## 如何更新网站

1. 直接在 GitHub 网页打开对应文件 → 点铅笔图标编辑 → Commit changes
2. 或本地改完后 `git add . && git commit -m "update" && git push`
3. Cloudflare Pages 约 1 分钟自动重新部署上线

## 主要内容模块

| 模块 | 内容说明 |
|---|---|
| 医院陪护 | 24小时/日间陪护、术后特护、养老院陪护，覆盖昆山各镇医院 |
| 住家护理 | 24小时住家老人照护，可签三方协议 |
| 保洁服务 | 医院/养老院/办公室/工厂/住宅/开荒保洁，可签定期合同 |
| 理赔协助 | 交通事故伤残鉴定材料整理、流程对接、全程陪同 |
| 诚聘护工 | 护工/保洁招聘要求、收入说明、在线应聘 |
| 公司资质 | 营业执照信息、统一信用代码、服务承诺 |
| 联系我们 | 电话+微信+地址+在线表单 |

## 微信生态衔接（规划中）

- **企业微信**：`yikangcare`（已启用，可添加咨询）
- **微信视频号**：筹备中，计划发布护理技巧、招聘通知、服务案例
- **微信小程序**：筹备中，计划支持在线预约护工、查看护工资质、领取优惠券

页面中已预留视频号、小程序入口占位，开通后只需替换对应链接或二维码即可。

## 图片资源

| 用途 | 文件 |
|---|---|
| 首屏团队实景 | `image/ykteam.jpg` |
| 服务场景图库 | `image/Nursing1.jpg`、`image/Nursing2.jpg`、`image/Nursing3.jpg`、`image/workplace1.jpg` |
| 公司资质与品牌展示 | `image/ykhonor.jpg`、`image/ykbusiness-card.png`、`image/yklogo.png` |
| 暂未上屏备用 | `image/office.png`、`image/other*.jpg`、`image/workplace*.jpg` |

## 已做优化

### 搜索引擎优化（SEO）
- ✅ 6 个页面各自拥有独立 Title / Description / Keywords，覆盖「昆山+镇名+服务」长尾关键词。
- ✅ 每个页面添加 `canonical` 规范链接、Open Graph / Twitter Card 分享卡片。
- ✅ 添加 `robots.txt` 与 `sitemap.xml`，引导百度、360、搜狗、必应等爬虫收录。
- ✅ 添加 `LocalBusiness`、`Service`、`JobPosting`、`BreadcrumbList`、`FAQPage` 等 Schema.org 结构化数据。
- ✅ 添加百度、360、搜狗、必应站长平台验证代码占位。
- ✅ 添加 `favicon.svg`、`manifest.json`、`humans.txt` 等站点身份标识。
- ✅ 修复首屏 Logo 区域异常 HTML 标签。
- ✅ 所有图片均设置 `alt` 属性，利于图片搜索。
- ✅ 服务卡片与页脚增加内部链接，提升页面权重流动。

### 技术与性能
- ✅ 自定义 `404.html`。
- ✅ Cloudflare Pages `_redirects`（www 跳转、HTTPS 统一、/index.html 跳转）。
- ✅ Cloudflare Pages `_headers`，配置安全头与静态资源长期缓存。
- ✅ 移动端底部固定快捷联系栏、导航折叠、价格表横向滚动等体验优化。
- ✅ 表单提交生成邮件咨询内容。

## 上线前待办

1. **搜索引擎站长验证**
   - 登录 [百度站长平台](https://ziyuan.baidu.com/)、[360 站长平台](https://zhanzhang.so.com/)、[搜狗站长平台](https://zhanzhang.sogou.com/)、[必应站长平台](https://www.bing.com/webmasters/)。
   - 将各自提供的验证代码替换所有 HTML 页面中对应的占位文字：
     ```html
     <meta name="baidu-site-verification" content="请将此处替换为百度站长验证码">
     ```

2. **提交站点地图**
   在各站长平台提交：
   ```
   https://yikangcare.com/sitemap.xml
   ```

3. **ICP 备案（如有）**
   取消 `index.html` / `recruit.html` / 各详情页中 ICP meta 的注释，并填入真实备案号：
   ```html
   <meta name="icp" content="苏ICP备XXXXXXXX号">
   ```

4. **微信生态完善**
   - 开通微信视频号后，将页面中「视频号（筹备中）」替换为真实视频号主页链接。
   - 开发/上线微信小程序后，将「小程序（筹备中）」替换为小程序码或跳转链接。
   - 可在「联系我们」区域添加微信二维码图片。

5. **后续可进一步提升**
   - 接入真实表单后端（Formspree / Cloudflare Forms / 微信小程序接口）。
   - 替换或补充更多真实服务场景照片。
   - 为各重点镇区单独创建落地页（如 `/lujia.html`、`/qiandeng.html`），进一步抢占本地搜索流量。

## 本地预览

```bash
python -m http.server 8000 --bind 127.0.0.1
```

打开 http://127.0.0.1:8000 预览。

---

公司名称：昆山市益康家政服务有限公司  
统一信用代码：91320583MA1T60CC2J  
地址：昆山开发区前进东路1111号113室
