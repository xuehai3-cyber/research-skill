// Obsidian Local REST API 封装
// API: https://github.com/coddingtonbear/obsidian-local-rest-api
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.research-config.json');
const agent = new https.Agent({ rejectUnauthorized: false });

let _config = null;

export function loadConfig() {
  if (_config) return _config;
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('❌ 未找到配置文件 ~/.research-config.json');
    console.error('   请先运行: node setup.js');
    process.exit(1);
  }
  _config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return _config;
}

function req(method, vaultPath, body) {
  const { apiBase, apiKey } = loadConfig();
  const url = `${apiBase}/vault/${vaultPath}`;
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'text/markdown; charset=utf-8',
      },
      agent,
    };
    const r = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          resolve({ ok: false, status: res.statusCode, body: data });
        } else {
          resolve({ ok: true, status: res.statusCode, body: data });
        }
      });
    });
    r.on('error', (e) => resolve({ ok: false, status: 0, body: e.message }));
    if (body) r.write(body, 'utf8');
    r.end();
  });
}

// 获取 vault 根目录名（用于路径拼接）
export function getVaultDir() {
  return loadConfig().vaultDir || 'Clippings';
}

export async function writeFile(vaultPath, content) {
  return req('PUT', vaultPath, content);
}

export async function readFile(vaultPath) {
  return req('GET', vaultPath);
}

export async function listDir(dirPath) {
  const p = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  return req('GET', p);
}

export async function fileExists(vaultPath) {
  const result = await req('GET', vaultPath);
  return result.ok;
}

export function safeFilename(title) {
  let name = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length > 80) name = name.slice(0, 80);
  return name || 'untitled';
}

export function clipFilename(title) {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return `${date} ${safeFilename(title)}.md`;
}

export function buildClipContent(title, url, text) {
  const now = new Date().toISOString();
  return `---
title: "${title}"
source: ${url}
clipped: ${now}
---

# ${title}

> 来源: ${url}

${text}`;
}
