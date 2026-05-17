#!/usr/bin/env node
// /research — 网页知识采集技能
// 用法:
//   node research.js clip <URL> [分类]    剪藏到 vault 目录
//   node research.js status               检查 REST API 状态

import { spawn } from 'child_process';
import fs from 'fs';
import { writeFile, listDir, clipFilename, buildClipContent, getVaultDir } from './rest-api.js';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FETCH_PAGE = path.join(__dirname, '..', 'fetch-webpage', 'fetch-page.js');

const command = process.argv[2];
const target = process.argv[3];
const category = process.argv[4] || '';

const BASE = getVaultDir();

if (!command || command === 'help') {
  console.log(`用法:
  node research.js clip <URL> [分类]     剪藏到 ${BASE}/[分类]/
  node research.js status                检查 REST API 状态

  分类示例: 技术, 历史, 科学, 哲学, 商业, 设计, 文学...
  不填分类则存到 ${BASE}/ 根目录`);
  process.exit(0);
}

if (command === 'status') {
  const checkPath = category ? `${BASE}/${category}/` : `${BASE}/`;
  const result = await listDir(checkPath);
  if (result.ok) {
    console.log('✅ Obsidian REST API 已就绪');
    const files = JSON.parse(result.body).files || [];
    console.log(`   ${checkPath}: ${files.length} 个文件`);
  } else {
    console.log('❌ Obsidian REST API 不可用');
    console.log(`   ${result.status}: ${result.body}`);
  }
  process.exit(0);
}

if (command === 'clip' && target) {
  if (!fs.existsSync(FETCH_PAGE)) {
    console.log('❌ 缺少 fetch-webpage 技能');
    console.log('   安装: git clone https://github.com/xuehai3-cyber/fetch-webpage.git ~/.claude/skills/fetch-webpage');
    console.log('   或通过 install 脚本安装时会自动检查');
    process.exit(1);
  }
  console.log(`🔍 抓取: ${target}`);
  const content = await fetchPage(target);
  if (!content || !content.text) {
    console.log('❌ 未能抓取到内容');
    process.exit(1);
  }

  const title = content.title || target;
  console.log(`📄 ${title}`);
  console.log(`   ${content.length} 字符 | 方式: ${content.method}`);

  const dirPath = category ? `${BASE}/${category}/` : `${BASE}/`;

  let filename = clipFilename(title);
  const check = await listDir(dirPath);
  if (check.ok) {
    const files = JSON.parse(check.body).files || [];
    const existing = files.find(f => f === filename);
    if (existing) {
      const base = filename.replace(/\.md$/, '');
      const suffix = Date.now().toString().slice(-6);
      filename = `${base} ${suffix}.md`;
      console.log(`   ⚠️ 已存在，使用新名: ${filename}`);
    }
  }

  const markdown = buildClipContent(title, target, content.text);
  const vaultPath = `${dirPath}${filename}`;
  const result = await writeFile(vaultPath, markdown);

  if (result.ok) {
    console.log(`\n✅ 已保存: ${vaultPath}`);
  } else {
    console.log(`\n❌ 写入失败 [${result.status}]: ${result.body}`);
    process.exit(1);
  }
} else {
  console.log('用法: node research.js clip <URL> [分类]');
  process.exit(1);
}

function fetchPage(url) {
  return new Promise((resolve) => {
    const child = spawn('node', [FETCH_PAGE, url], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', c => stdout += c);
    child.stderr.on('data', c => stderr += c);

    child.on('close', () => {
      const text = stdout.trim();
      const titleMatch = text.match(/^# (.+)$/m);
      const title = titleMatch ? titleMatch[1] : '';

      resolve({
        text: text.replace(/^# .+\n\n?/, ''),
        title,
        length: text.length,
        method: stderr.includes('浏览器') ? 'browser' : 'http',
      });
    });

    child.on('error', () => resolve(null));
  });
}
