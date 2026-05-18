#!/usr/bin/env node
/**
 * fetch-page.js — 智能网页抓取（Readability + Puppeteer 驱动）
 *
 * 快路径 (HTTP + Readability) + 慢路径 (浏览器 CDP)，自动选择。
 * 浏览器持久运行，同一域名后续抓取秒级响应。
 *
 * 用法: node fetch-page.js <URL> [--html] [--screenshot]
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');
const puppeteer = require('puppeteer-core');

const CDP_PORT = 9222;
const CDP_HOST = `http://localhost:${CDP_PORT}`;
const CHROME_PROFILE = path.join(os.homedir(), '.chrome-cdp-profile');
const CHROME_EXE = path.join(
  process.env.LOCALAPPDATA || '',
  'Google', 'Chrome', 'Application', 'chrome.exe'
);

const url = process.argv[2];
if (!url) {
  console.error('用法: node fetch-page.js <URL> [--html] [--screenshot]');
  console.error('示例: node fetch-page.js "https://example.com"');
  process.exit(1);
}

const saveHtml = process.argv.includes('--html');
const doScreenshot = process.argv.includes('--screenshot');

// ── 工具 ────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function httpGet(url) {
  return new Promise((resolve) => {
    const transport = url.startsWith('https') ? https : http;
    transport.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    }).on('error', () => resolve(null));
  });
}

// ── 正文提取 (Readability + turndown) ─────────────────
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

function extractContent(html, pageUrl) {
  try {
    const dom = new JSDOM(html, { url: pageUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article && article.content && article.textContent.length > 100) {
      let markdown = turndownService.turndown(article.content);
      // 清理多余空行
      markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
      return { text: markdown, title: article.title || '' };
    }

    // 回退: DOM 选择器
    const fallback = domFallback(dom.window.document);
    if (fallback) {
      let markdown = turndownService.turndown(fallback);
      markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
      const titleEl = dom.window.document.querySelector('title');
      const title = titleEl ? titleEl.textContent.trim() : '';
      return { text: markdown, title };
    }
  } catch (e) {
    // Readability 失败 → 回退
  }

  // 完全失败，返回空让上层降级到浏览器
  return { text: '', title: '' };
}

function domFallback(document) {
  const selectors = [
    'article',
    '.article-content', '.post-content', '.entry-content',
    '.article-body', '.post-body', '.article-text',
    '[role="main"]', 'main',
    '.content', '#content',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim().length > 100) {
      return el.outerHTML;
    }
  }
  return null;
}

// ── Chrome CDP 管理 ─────────────────────────────────
async function isCDPReady() {
  const result = await httpGet(`${CDP_HOST}/json/version`);
  return result && result.webSocketDebuggerUrl;
}

async function startChrome() {
  console.error('[chrome] 启动 Headless Chrome (独立 profile)...');
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${CHROME_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
  ];
  spawn(CHROME_EXE, args, { detached: true, stdio: 'ignore' }).unref();

  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    if (await isCDPReady()) {
      console.error('[chrome] CDP 就绪');
      return true;
    }
  }
  console.error('[chrome] 启动超时');
  return false;
}

async function ensureChrome() {
  if (await isCDPReady()) {
    console.error('[chrome] CDP 已在线，复用');
    return true;
  }
  return await startChrome();
}

// ── 快路径: HTTP 直接请求 ───────────────────────────
function fastFetch(url) {
  return new Promise((resolve) => {
    const transport = url.startsWith('https') ? https : http;
    const req = transport.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
      },
    }, (res) => {
      // 跟踪重定向
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        const redirect = res.headers.location;
        if (redirect) {
          const newUrl = redirect.startsWith('http') ? redirect : new URL(redirect, url).href;
          return resolve(fastFetch(newUrl));
        }
      }

      const chunks = [];
      const encoding = (res.headers['content-encoding'] || '').toLowerCase();
      const contentType = res.headers['content-type'] || '';

      if (encoding === 'gzip') {
        const gunzip = zlib.createGunzip();
        res.pipe(gunzip);
        gunzip.on('data', c => chunks.push(c));
        gunzip.on('end', () => processChunks(Buffer.concat(chunks)));
      } else if (encoding === 'deflate') {
        const inflate = zlib.createInflate();
        res.pipe(inflate);
        inflate.on('data', c => chunks.push(c));
        inflate.on('end', () => processChunks(Buffer.concat(chunks)));
      } else {
        res.on('data', c => chunks.push(c));
        res.on('end', () => processChunks(Buffer.concat(chunks)));
      }

      function processChunks(data) {
        const raw = data.toString('utf8');

        // JSON 响应
        if (contentType.includes('json') || (raw.trim().startsWith('{') && raw.trim().endsWith('}'))) {
          try {
            const json = JSON.parse(raw);
            const text = JSON.stringify(json, null, 2);
            resolve({ text, method: 'fast-http', length: text.length, contentType, statusCode: res.statusCode });
            return;
          } catch { /* fall through to HTML */ }
        }

        // HTML → Readability 智能正文提取
        if (contentType.includes('text/html') || contentType.includes('text/plain') || raw.includes('<')) {
          const { text, title } = extractContent(raw, url);
          resolve({ text, title, method: 'fast-http', length: text.length, contentType, statusCode: res.statusCode });
        } else {
          resolve({ text: raw.slice(0, 5000), method: 'fast-http', length: raw.length, contentType, statusCode: res.statusCode });
        }
      }
    });

    req.on('error', (err) => resolve({ text: '', method: 'fast-http', length: 0, error: err.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ text: '', method: 'fast-http', length: 0, error: 'timeout' }); });
  });
}

// ── 慢路径: Chrome CDP 浏览器渲染 (复用 chrome-devtools-mcp 的 Chrome) ──
async function browserFetch(pageUrl) {
  let browser;
  try {
    browser = await puppeteer.connect({
      browserURL: `http://localhost:${CDP_PORT}`,
      defaultViewport: { width: 1280, height: 720 },
    });
  } catch (e) {
    return { text: '', method: 'browser', length: 0, error: 'CDP 连接失败: ' + e.message };
  }

  try {
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // 获取完整 HTML，然后走 Readability 管道
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const { text, title } = extractContent(html, pageUrl);

    // 截图（可选）
    if (doScreenshot) {
      const screenshotFile = path.join(process.cwd(), `screenshot-${Date.now()}.png`);
      await page.screenshot({ path: screenshotFile, fullPage: false });
      console.error(`[截图] ${screenshotFile}`);
    }

    // HTML 保存（可选）
    if (saveHtml) {
      const htmlFile = path.join(process.cwd(), `page-${Date.now()}.html`);
      fs.writeFileSync(htmlFile, html, 'utf8');
      console.error(`[HTML] ${htmlFile}`);
    }

    await page.close();

    return { text, title: title || (await page.title()), method: 'browser', length: text.length };
  } catch (e) {
    return { text: '', method: 'browser', length: 0, error: e.message };
  }
}

// ── 飞书检测 ─────────────────────────────────────────
function isFeishu(url) {
  return url.includes('feishu.cn') || url.includes('feishu.net');
}

// ── 主流程 ───────────────────────────────────────────
(async () => {
  console.error('正在抓取:', url);
  console.error('');

  // 飞书需要浏览器渲染（API 拦截），跳过快路径
  let result;
  if (!isFeishu(url)) {
    // 快路径: 直接 HTTP 请求
    console.error('── 快路径 (HTTP) ──');
    const start = Date.now();
    result = await fastFetch(url);
    console.error(`   耗时: ${Date.now() - start}ms | 内容: ${result.length} 字符`);

    // 判断是否需要降级到浏览器
    if (result.length < 200 && !result.error?.includes('timeout')) {
      console.error('   内容过短，疑似 SPA，降级到浏览器...');
    } else if (result.length > 0) {
      // 快路径成功
      if (result.title) console.log(`# ${result.title}\n`);
      console.log(result.text);
      if (result.text.length < 50) {
        console.error('\n⚠️ 内容较短，如需完整内容可加 --browser 参数');
      }
      process.exit(0);
    }
  }

  // 慢路径: 浏览器渲染
  console.error('── 浏览器路径 ──');

  if (!(await ensureChrome())) {
    console.error('Chrome 启动失败');
    process.exit(1);
  }

  const start = Date.now();
  result = await browserFetch(url);
  console.error(`   耗时: ${Date.now() - start}ms | 方式: ${result.method} | 内容: ${result.length} 字符`);

  if (result.text) {
    if (result.title) console.log(`# ${result.title}\n`);
    console.log(result.text);
  } else {
    console.error('未能提取到内容:', result.error || '未知错误');
    process.exit(1);
  }

  // 不关闭浏览器，保持持久化以便后续快速调用
})();
