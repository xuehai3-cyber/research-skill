#!/usr/bin/env node
// setup.js — /research 技能初始化配置
// 用法: node setup.js

import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(os.homedir(), '.research-config.json');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

console.log(`
╔══════════════════════════════════════════╗
║     /research 技能 — 初始化配置          ║
╚══════════════════════════════════════════╝

这个脚本会帮你配置 Obsidian REST API 连接。
前置条件:
  1. Obsidian 已安装并运行
  2. obsidian-local-rest-api 插件已启用
  3. 在插件设置中已生成 API Key

如果你还没配置这些，请先完成再继续。
`);

const apiBase = await ask('REST API 地址 (默认 https://localhost:27124): ') || 'https://localhost:27124';
const apiKey = await ask('API Key: ');
const vaultDir = await ask('Vault 内目标目录 (默认 Clippings): ') || 'Clippings';

const config = {
  apiBase: apiBase.trim(),
  apiKey: apiKey.trim(),
  vaultDir: vaultDir.trim(),
};

fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
console.log(`\n✅ 配置已保存到 ${CONFIG_PATH}`);

// 验证连接
console.log('\n🔍 验证连接...');
try {
  const res = await fetch(`${config.apiBase}/vault/`, {
    headers: { 'Authorization': `Bearer ${config.apiKey}` },
  });
  if (res.ok) {
    console.log('✅ 连接成功！');
  } else {
    console.log(`⚠️ 连接失败 ${res.status}，请检查 Obsidian 是否运行`);
  }
} catch {
  console.log('⚠️ 无法连接，请确认 Obsidian 正在运行且 REST API 已启用');
}

console.log('\n现在可以用了:');
console.log(`  node ${__dirname.replace(/\\/g, '/')}/research.js clip "<URL>" "<分类>"`);
console.log(`  node ${__dirname.replace(/\\/g, '/')}/research.js status`);

rl.close();
