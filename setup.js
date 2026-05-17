#!/usr/bin/env node
// setup.js — /research 技能一键安装 + 自动配置
// npx github:xuehai3-cyber/research-skill → 复制文件 + 自动提取 Obsidian API Key
// node setup.js (在技能目录中) → 仅重新配置

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.join(os.homedir(), '.claude', 'skills', 'research');
const CONFIG_PATH = path.join(os.homedir(), '.research-config.json');

// npx 模式：脚本不在技能目录 → 先复制文件，再配置
if (__dirname !== SKILL_DIR) {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   /research 技能 — npx 一键安装          ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`📦 安装到: ${SKILL_DIR}`);

  fs.mkdirSync(SKILL_DIR, { recursive: true });
  const files = ['research.js', 'rest-api.js', 'SKILL.md', 'config.json.example'];
  for (const f of files) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(SKILL_DIR, f));
    }
  }
  console.log('✅ 文件已复制');
  console.log('');

  // 切换到技能目录继续配置
  process.chdir(SKILL_DIR);
  console.log('🔧 自动配置...');
  console.log('');
}

function findObsidianConfig() {
  const platform = process.platform;
  const candidates = [];
  if (platform === 'win32') candidates.push(path.join(process.env.APPDATA || '', 'obsidian', 'obsidian.json'));
  else if (platform === 'darwin') candidates.push(path.join(os.homedir(), 'Library', 'Application Support', 'obsidian', 'obsidian.json'));
  else candidates.push(path.join(os.homedir(), '.config', 'obsidian', 'obsidian.json'));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findApiConfig(obsidianConfigPath) {
  const obsidianCfg = JSON.parse(fs.readFileSync(obsidianConfigPath, 'utf8'));
  const vaults = obsidianCfg.vaults || {};

  for (const [hash, info] of Object.entries(vaults)) {
    const pluginCfg = path.join(info.path, '.obsidian', 'plugins', 'obsidian-local-rest-api', 'data.json');
    if (fs.existsSync(pluginCfg)) {
      const cfg = JSON.parse(fs.readFileSync(pluginCfg, 'utf8'));
      if (cfg.apiKey) {
        return {
          apiBase: `https://localhost:${cfg.port || 27124}`,
          apiKey: cfg.apiKey,
          vaultDir: 'Clippings',
          vaultPath: info.path,
        };
      }
    }
  }
  return null;
}

console.log('╔══════════════════════════════════════════╗');
console.log('║     /research 技能 — 自动配置            ║');
console.log('╚══════════════════════════════════════════╝');
console.log('');

// 1. 自动检测
const obsidianCfg = findObsidianConfig();
if (!obsidianCfg) {
  console.log('❌ 未找到 Obsidian 配置文件');
  console.log('   请确认 Obsidian 已安装并至少运行过一次');
  process.exit(1);
}

console.log(`📁 Obsidian 配置: ${obsidianCfg}`);

const apiConfig = findApiConfig(obsidianCfg);
if (!apiConfig) {
  console.log('❌ 未找到 obsidian-local-rest-api 插件配置');
  console.log('   请先在 Obsidian 中安装并启用该插件，生成 API Key');
  process.exit(1);
}

console.log(`🔑 API Key: ${apiConfig.apiKey.slice(0, 8)}...${apiConfig.apiKey.slice(-8)}`);
console.log(`🌐 API 地址: ${apiConfig.apiBase}`);
console.log(`📂 Vault: ${apiConfig.vaultPath}`);

// 2. 写入配置
const config = {
  apiBase: apiConfig.apiBase,
  apiKey: apiConfig.apiKey,
  vaultDir: apiConfig.vaultDir,
};
fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
console.log(`\n✅ 配置已保存: ${CONFIG_PATH}`);

// 3. 验证连接
console.log('\n🔍 验证连接...');
try {
  const res = await fetch(`${config.apiBase}/vault/`, {
    headers: { 'Authorization': `Bearer ${config.apiKey}` },
  });
  if (res.ok) {
    console.log('✅ 连接成功！');
  } else {
    console.log(`⚠️ 连接失败 (${res.status})，请确认 Obsidian 正在运行`);
  }
} catch {
  console.log('⚠️ 无法连接，请确认 Obsidian 正在运行且 REST API 已启用');
}

console.log('');
console.log('═══════════════════════════════════════════');
console.log('  安装完成！在 Claude Code 中说：');
console.log('  "我想7天学会 Claude Code 开发"');
console.log('  或直接: /research');
console.log('═══════════════════════════════════════════');
