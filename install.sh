#!/bin/bash
set -e
echo "╔══════════════════════════════════════════╗"
echo "║     /research 技能 — 一键安装            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

SKILL_DIR="$HOME/.claude/skills/research"

# 1. Clone research skill
if [ -d "$SKILL_DIR" ]; then
  echo "📁 research 目录已存在，更新..."
  cd "$SKILL_DIR" && git pull
else
  echo "📥 下载 research skill..."
  mkdir -p "$(dirname "$SKILL_DIR")"
  git clone https://github.com/xuehai3-cyber/research-skill.git "$SKILL_DIR"
fi

# 2. Install npm dependencies (Readability, puppeteer, turndown)
echo ""
echo "📦 安装 npm 依赖..."
cd "$SKILL_DIR" && npm install

# 3. Run setup
echo ""
echo "🔧 配置 API 连接..."
node "$SKILL_DIR/setup.js"

echo ""
echo "═══════════════════════════════════════════"
echo "  安装完成！"
echo "  用法: node ~/.claude/skills/research/research.js clip \"<URL>\" \"<分类>\""
echo "═══════════════════════════════════════════"
