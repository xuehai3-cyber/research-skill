# /research — 网页知识采集技能

一句话把相关的多个网页变成知识：全自动采集 → 精排 → 学习计划。

## 技术栈

- Node.js >= 18
- fetch-page.cjs：双路径抓取（HTTP 直连快路径 + Chrome CDP 浏览器慢路径）
- rest-api.js：通过 Obsidian local REST API 读写 vault 文件
- 依赖包：`@mozilla/readability`、`jsdom`、`puppeteer-core`、`turndown`
- 运行环境：Windows 10，Chrome 浏览器通过 CDP 连接（`ws://localhost:9222`）

## 项目结构

```
research.js          ← 主入口：clip 命令 + status 命令
fetch-page.cjs       ← 网页抓取（HTTP / 浏览器双路径）
rest-api.js          ← Obsidian REST API 封装
setup.js             ← 安装脚本（生成 ~/.research-config.json）
SKILL.md             ← 技能定义（触发条件 + 执行步骤）
```

## 核心流程

1. WebSearch 搜索 → 8-12 条结果
2. AskUserQuestion 让用户勾选 → 排除图书简介、广告、导航页
3. 逐条 `node research.js clip "<URL>" "<分类>"` 剪藏
4. 精排每篇（排除导航/广告/评论区，保留正文+代码+表格）
5. 生成 INDEX.md（总览 + 双链 + 阅读顺序）
6. 生成 STUDYPLAN.md（分阶段路线 + 动手任务 + 检查点）

## 硬约束

- 所有采集内容写入 Obsidian vault，不得写入其他位置
- fetch-page.cjs 优先走 HTTP 直连，SPA/飞书等动态页面才走浏览器
- 每次 clip 前先检查 `research.js status`，Obsidian 不可用时停止并提示用户
- 精排时不得删除原文正文、代码块、表格

## 验证命令

每次采集完成后，逐项检查：
- [ ] `node research.js status` 返回 ✅
- [ ] 剪藏文件存在于 vault 目录，大小 > 500 字节
- [ ] 内容包含标题（以 `# ` 开头）
- [ ] 不含导航栏残留（搜索"导航"、"首页"、"上一篇"均无匹配）
- [ ] 不含广告残留（搜索"广告"、"赞助"、"推广"均无匹配）
- [ ] 代码块围栏配对完整（``` 出现次数为偶数）
- [ ] 内容完整性抽查：打开原网页，对比开头第一句话 → 随便一个中间小标题下的第一句话 → 最后一段第一句话，三处都对上说明重点知识没漏，这篇合格

## 已知问题与处理

| 问题 | 现象 | 处理方式 |
|------|------|---------|
| 内容噪音 | 抓取结果夹杂导航、广告、推荐 | 精排环节逐篇检查，按精排规则剔除 |
| 网络失败 | HTTP 请求超时或连接被拒 | 重试 2 次（间隔 3 秒），仍失败则走浏览器路径 |
| agent-browser 不稳定 | 浏览器路径启动失败或卡住 | 优先 HTTP 直连，浏览器仅作备选；浏览器超时 30 秒自动终止 |
| CMD 弹窗 | Windows 上 spawn 子进程弹出黑窗口 | fetch-page.cjs 使用 `windowsHide: true` |

## 会话收尾

每次会话结束前：
- 更新 README.md 记录本次改了什么
- git commit 所有改动
- 如果任务未完成，在 commit message 中注明进度
