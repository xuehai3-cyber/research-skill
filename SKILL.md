# /research — 网页知识采集技能

用户只需说一句话，如"我想 7 天学会用 Claude Code 写程序"，全流程自动完成：

> WebSearch 搜索 → 用户勾选 → 剪藏到 Obsidian → 精排每篇 → 生成 INDEX.md 总览 → 生成 STUDYPLAN.md 学习计划

## 识别触发

以下表达都触发全流程：
- "我想X天学会Y"
- "帮我收集Z的学习资料并做个计划"
- "搜一下A相关的文章，整理成课程"
- "/research" + 主题描述

## 执行步骤

1. **搜索**：WebSearch 搜索用户主题，取 8-12 条高质量结果
2. **选择**：展示列表，AskUserQuestion 让用户勾选
3. **采集**：逐条执行 `node ~/.claude/skills/research/research.js clip "<URL>" "<分类>"`
4. **精排**：逐篇清理噪音、恢复标题层级、统一排版，PUT 写回
5. **总览**：生成 INDEX.md（主题概述 + 每篇摘要 + 阅读顺序 + 文章关联）
6. **学习计划**：生成 STUDYPLAN.md（分阶段路线 + 动手任务 + 检查点 + 时间估算）

## 单独使用

用户也可以单独触发某个步骤：
- 只采集：`node ~/.claude/skills/research/research.js clip "<URL>" "<分类>"`
- 只出报告："帮我整理技术分类下的文章"
- 只要计划："给 Vibe Coding 资料做个学习计划"

## 前提

- 用户已运行过 `setup.js`（`~/.research-config.json` 存在）
- Obsidian 运行 + obsidian-local-rest-api 插件启用
- 若 `research.js status` 返回 ❌，提醒用户检查 Obsidian
