# /research — 网页知识采集技能

采集 → 精排 → 学习计划，三步把网页变成知识。

## 首次使用

如果用户尚未配置，引导运行：`node ~/.claude/skills/research/setup.js`

## 模式一：clip — 采集

```bash
node ~/.claude/skills/research/research.js clip "<URL>" "<分类>"
```

用户给 URL 时直接剪藏。用户给主题时：WebSearch 搜索 → 展示结果 → 用户勾选 → 逐条剪藏。分类由 Claude 根据内容判断。

## 模式二：report — 精排 + 总览

用户说「出报告」「整理」「report」时触发。对指定分类下所有文章：

1. 通过 REST API 列目录：`curl -k GET /vault/<vaultDir>/<分类>/`
2. 逐篇读取内容
3. **逐篇精排**：清理导航/广告/页脚噪音、恢复标题层级、统一排版、文末加来源链接
4. PUT 写回覆盖原文件
5. **生成 INDEX.md**：主题概述、每篇摘要、建议阅读顺序、文章关联

## 模式三：studyplan — 学习计划

用户说「学习计划」「studyplan」「怎么学」时触发。基于 INDEX.md 生成 STUDYPLAN.md：

- 学习目标、分阶段路线（每阶段含阅读材料+动手任务+检查点）
- 时间估算、核心心法

## 前提

- Obsidian 运行 + obsidian-local-rest-api 插件启用
- 已通过 setup.js 完成配置（`~/.research-config.json`）
- 若 `research.js status` 返回 ❌，提醒用户检查 Obsidian
