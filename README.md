# /research — 网页知识采集技能

将网页内容剪藏到 Obsidian 知识库。采集 → 精排 → 学习计划，三步把网页变成知识。

## 前置条件

- **Obsidian** 已安装并运行
- **[obsidian-local-rest-api](https://github.com/coddingtonbear/obsidian-local-rest-api)** 插件已安装启用
- 在插件设置中开启 **API Key 认证**并生成 Key
- **Node.js** >= 18

## 安装

### 一行安装

**Windows (PowerShell):**
```powershell
irm https://raw.githubusercontent.com/xuehai3-cyber/research-skill/master/install.ps1 | iex
```

**macOS / Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/xuehai3-cyber/research-skill/master/install.sh | bash
```

脚本会自动完成：下载 → 配置 API Key → 检查依赖。

### 手动安装

```bash
git clone https://github.com/xuehai3-cyber/research-skill.git ~/.claude/skills/research
node ~/.claude/skills/research/setup.js
```

> **剪藏功能**需要 [fetch-webpage](https://github.com/) 技能配合，但不影响 report / studyplan / status。

## 使用

### clip — 采集网页

```bash
# 剪藏单个 URL
node ~/.claude/skills/research/research.js clip "https://example.com"

# 指定分类子目录
node ~/.claude/skills/research/research.js clip "https://example.com" "技术"

# 检查 REST API 状态
node ~/.claude/skills/research/research.js status
```

在 Claude Code 中直接说：
- "剪藏 https://xxx.com"
- "搜索并剪藏关于 Kubernetes 的资料"

### report — 精排 + 生成总览

对已剪藏的文章进行整理：清理噪音、统一排版、生成 INDEX.md 总览。

在 Claude Code 中说：
- "帮我整理技术分类下的文章"
- "出报告"

### studyplan — 学习计划

基于已收集的资料，生成分阶段学习计划。

在 Claude Code 中说：
- "帮我做个学习计划"
- "我想系统学习这些内容"

## 工作原理

```
research.js clip <URL>
    ↓
fetch-page.js → 网页内容（HTTP 快路径 / 浏览器慢路径）
    ↓
rest-api.js → Obsidian REST API (PUT/GET)
    ↓
Obsidian vault → 指定目录
```

## 文件结构

```
~/.claude/skills/research/
├── research.js      CLI 入口
├── rest-api.js      REST API 封装
├── setup.js         初始化脚本
├── SKILL.md         技能说明
├── config.json.example  配置模板
└── README.md        本文件
```

## 常见问题

**Q: 剪藏失败，提示 REST API 不可用？**
A: 确认 Obsidian 正在运行，且 `obsidian-local-rest-api` 插件已启用。

**Q: API Key 在哪里找？**
A: Obsidian → 设置 → obsidian-local-rest-api → API Key → 生成/复制。

**Q: 可以改目标目录吗？**
A: 编辑 `~/.research-config.json` 中的 `vaultDir` 字段，或重新运行 `setup.js`。

## 许可

MIT
