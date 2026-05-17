#!/bin/bash
set -e
echo "╔══════════════════════════════════════════╗"
echo "║     /research 技能 — 一键安装            ║"
echo "╚══════════════════════════════════════════╝"
echo ""

SKILL_DIR="$HOME/.claude/skills/research"
FETCH_DIR="$HOME/.claude/skills/fetch-webpage"

# 1. Clone research skill
if [ -d "$SKILL_DIR" ]; then
  echo "📁 research 目录已存在，更新..."
  cd "$SKILL_DIR" && git pull
else
  echo "📥 下载 research skill..."
  mkdir -p "$(dirname "$SKILL_DIR")"
  git clone https://github.com/xuehai3-cyber/research-skill.git "$SKILL_DIR"
fi

# 2. Check fetch-webpage dependency
if [ -d "$FETCH_DIR" ]; then
  echo "✅ fetch-webpage 已安装"
else
  echo ""
  echo "⚠️  缺少 fetch-webpage（剪藏功能需要）"
  echo "   如果你有 fetch-webpage 仓库，可以这样安装："
  echo "   git clone <fetch-webpage-repo> $FETCH_DIR"
  echo ""
  echo "   没有也不影响 report / studyplan / status 功能"
  echo ""
fi

# 3. Run setup
echo ""
echo "🔧 配置 API 连接..."
node "$SKILL_DIR/setup.js"

echo ""
echo "═══════════════════════════════════════════"
echo "  安装完成！"
echo "  用法: node ~/.claude/skills/research/research.js clip \"<URL>\" \"<分类>\""
echo "═══════════════════════════════════════════"
