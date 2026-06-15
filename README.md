# 昆山市益康家政服务有限公司官网

**域名：** https://yikangcare.com  
**部署：** Cloudflare Pages（GitHub push 即自动更新）  
**仓库：** vvohoo/yikangwebsite

---

## 文件结构

```
index.html   ← 单页官网（首页+服务+收费+招聘+联系）
README.md    ← 本说明文件
```

## 如何更新网站

1. 直接在 GitHub 网页打开 index.html → 点铅笔图标编辑 → Commit changes
2. 或本地改完后 `git add . && git commit -m "update" && git push`
3. Cloudflare Pages 约 1 分钟自动重新部署上线

## 主要内容模块

| 模块 | 内容说明 |
|---|---|
| Hero 首屏 | 程经理158 5030 1819 / 顾女士186 6225 4867 / 24小时 / 可开票 |
| 服务项目 | 医院陪诊看护、场所保洁、交通事故理赔协助 |
| 收费标准 | 护工计价方式（180-200元/天/人，多人叠加） |
| 接单流程 | 4步接单说明 |
| 诚聘护工 | 招聘要求、工作内容、收入说明 |
| 公司资质 | 营业执照信息、统一信用代码展示 |
| 联系我们 | 电话+微信+地址+在线表单 |

## 图片资源

| 用途 | 文件 |
|---|---|
| 首屏团队实景 | `image/ykteam.jpg` |
| 服务场景图库 | `image/Nursing1.jpg`、`image/Nursing2.jpg`、`image/Nursing3.jpg`、`image/workplace1.jpg`、`image/workplace3.jpg` |
| 公司资质与品牌展示 | `image/ykhonor.jpg`、`image/ykbusiness-card.png`、`image/yklogo.png` |
| 暂未上屏备用 | `image/office.png`、`image/other*.jpg`、`image/workplace2.jpg`、`image/workplace4.jpg`、`image/workplace5.jpg`、`image/workplace6.jpg` |

## 已做优化

- 增加 canonical、Open Graph URL、搜索关键词与本地商家结构化数据，便于搜索引擎理解公司信息、服务范围和联系方式。
- 优化移动端体验：导航折叠、价格表横向滚动、底部固定快捷联系栏。
- 表单提交改为生成邮件咨询内容，避免无后端情况下只显示“提交成功”。
- 优化品牌视觉：收敛圆角、阴影和图标风格，强化正规家政服务的可信感。
- 增加跳转主内容链接、焦点样式、表单 label 绑定等基础可访问性细节。
- 增加团队、护理、医院场景、锦旗与品牌名片照片展示。

## 本地预览

```bash
python -m http.server 8000 --bind 127.0.0.1
```

打开 http://127.0.0.1:8000 预览。

## 待完善

- [ ] 替换为真实场景照片
- [ ] 接入 Formspree、Cloudflare Forms 或其他后端表单通知到邮箱
- [ ] 添加微信二维码图片
- [ ] 后续可扩展多页面

---

公司名称：昆山市益康家政服务有限公司  
统一信用代码：91320583MA1T60CC2J  
地址：昆山开发区前进东路1111号113室
