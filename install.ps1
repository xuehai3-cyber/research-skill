Write-Host "╔══════════════════════════════════════════╗"
Write-Host "║     /research 技能 — 一键安装            ║"
Write-Host "╚══════════════════════════════════════════╝"
Write-Host ""

$SKILL_DIR = "$env:USERPROFILE\.claude\skills\research"

# 1. Clone research skill
if (Test-Path $SKILL_DIR) {
  Write-Host "📁 research 目录已存在，更新..."
  Set-Location $SKILL_DIR
  git pull
} else {
  Write-Host "📥 下载 research skill..."
  New-Item -ItemType Directory -Force -Path (Split-Path $SKILL_DIR -Parent) | Out-Null
  git clone https://github.com/xuehai3-cyber/research-skill.git $SKILL_DIR
}

# 2. Install npm dependencies (Readability, puppeteer, turndown)
Write-Host ""
Write-Host "📦 安装 npm 依赖..."
Set-Location $SKILL_DIR
npm install

# 3. Run setup
Write-Host ""
Write-Host "🔧 配置 API 连接..."
node "$SKILL_DIR\setup.js"

Write-Host ""
Write-Host "═══════════════════════════════════════════"
Write-Host "  安装完成！"
Write-Host "  用法: node ~/.claude/skills/research/research.js clip `<URL>` `<分类>`"
Write-Host "═══════════════════════════════════════════"
