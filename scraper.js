// scraper.js — Vercel-compatible (puppeteer-core + @sparticuz/chromium-min)
const axios = require('axios');
const { randomInt } = require('crypto');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium-min');

const CONFIG = {
  baseUrl: 'https://amprem.irfanjawa.com',
  authUrl: 'https://amprem.irfanjawa.com/auth',
  timeout: 60000,
  firebaseApiKey: 'AIzaSyDrZ9jr_Y16ltSBqsQR5IH6I04FRga6Ki0',
  domains: ['kintil.buzz', 'rexornge.net', 'alightmotion.icu'],
  pollingTimeout: 180000,
  delayMin: 2000,
  delayMax: 4000
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0'
];

// ============================================================
//  UTILITY
// ============================================================
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

function randomUA() {
  return USER_AGENTS[randomInt(0, USER_AGENTS.length - 1)];
}

function randomDomain() {
  return CONFIG.domains[randomInt(0, CONFIG.domains.length - 1)];
}

function randomDelay() {
  return sleep(randomInt(CONFIG.delayMin, CONFIG.delayMax));
}

function generateEmail() {
  return randomString(10) + '@' + randomDomain();
}

// ============================================================
//  LAUNCH BROWSER (Vercel / Local)
// ============================================================
async function getBrowser() {
  const isVercel = !!process.env.VERCEL;
  if (isVercel) {
    // Vercel: pake remote chromium
    return await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar'
      ),
      headless: chromium.headless,
      ignoreDefaultArgs: ['--disable-extensions'],
    });
  } else {
    // Local: coba cari chromium
    return await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
}

// ============================================================
//  FIREBASE OOB
// ============================================================
async function sendFirebaseVerification(email) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${CONFIG.firebaseApiKey}`;
  const payload = {
    email,
    requestType: "EMAIL_SIGNIN",
    continueUrl: "https://alightcreative.com",
    canHandleCodeInApp: true,
    androidPackageName: "com.alightcreative.motion",
    androidInstallApp: true,
    androidMinimumVersion: "12",
    iOSBundleId: "com.alightcreative.alightmotion"
  };
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': randomUA(),
    'Referer': 'https://alight-creative.firebaseapp.com/',
    'Origin': 'https://alight-creative.firebaseapp.com'
  };
  const res = await axios.post(url, payload, { headers, timeout: 15000 });
  return res.status === 200;
}

// ============================================================
//  TEMP MAIL (Generator.email)
// ============================================================
async function getInbox(email) {
  const [username, domain] = email.split('@');
  const url = `https://generator.email/${domain}/${username}`;
  const headers = {
    'User-Agent': randomUA(),
    'Accept': 'text/html',
    'Cookie': `inbox_ctx=${domain}%2F${username}`
  };
  try {
    const response = await axios.get(url, { headers, timeout: 10000 });
    const $ = cheerio.load(response.data);
    const loginLink = $('.mess_bodiyy a').attr('href');
    if (loginLink) return { link: loginLink };
    const body = $('.mess_bodiyy').text().trim();
    const match = body.match(/https:\/\/alight-creative\.firebaseapp\.com[^\s"']+/i) ||
                  body.match(/https:\/\/alightcreative\.com[^\s"']+/i);
    if (match) return { link: match[0] };
    return { link: null };
  } catch { return { link: null }; }
}

async function pollForLink(email, timeout = CONFIG.pollingTimeout) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const result = await getInbox(email);
    if (result.link) return result.link;
    await randomDelay();
  }
  return null;
}

// ============================================================
//  TURNSTILE SOLVER (Vercel = ⚠️ TIDAK BERFUNGSI)
// ============================================================
async function getFreshTurnstileToken(isRegisterTab = true) {
  // Peringatan: Di Vercel (headless), Turnstile tidak bisa dipecahkan.
  // Ini hanya placeholder. Kamu butuh proxy/API eksternal untuk bypass.
  console.warn('⚠️ Turnstile solver tidak berfungsi di Vercel (headless).');
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(CONFIG.authUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(4000);
    if (isRegisterTab) {
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('.card button[type="button"]');
        if (buttons.length >= 2) buttons[1].click();
      });
      await sleep(4000);
    }
    // Coba ambil token dari input (hanya berhasil jika Turnstile sudah terpecahkan)
    let token = '';
    let deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      token = await page.evaluate(() => {
        const e = document.querySelector('input[name="cf-turnstile-response"]');
        return e ? e.value : '';
      }).catch(() => '');
      if (token && token.length > 50) break;
      await sleep(2000);
    }
    const cookies = await page.cookies();
    await browser.close();
    if (!token || token.length < 50) throw new Error('Gagal dapat token Turnstile (headless)');
    return { token, cookies };
  } catch (e) {
    await browser.close();
    throw e;
  }
}

// ============================================================
//  AMPREM CLIENT
// ============================================================
class AmpremClient {
  constructor(initialCookies = []) {
    this.sessionCookies = {};
    initialCookies.forEach(c => { this.sessionCookies[c.name] = c.value; });
  }
  _cookieStr() {
    return Object.entries(this.sessionCookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async request(method, path, data = null) {
    const url = CONFIG.baseUrl + path;
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': randomUA(),
      'Cookie': this._cookieStr(),
      'Accept': 'application/json'
    };
    try {
      const res = await axios({ method, url, data, headers, timeout: CONFIG.timeout });
      if (res.headers['set-cookie']) {
        res.headers['set-cookie'].forEach(c => {
          const [name, val] = c.split(';')[0].split('=');
          this.sessionCookies[name] = val;
        });
      }
      return res;
    } catch (error) {
      if (error.response) return error.response;
      throw error;
    }
  }
  async register(email, password, token) {
    return await this.request('POST', '/api/auth/register', { email, password, turnstileToken: token });
  }
  async login(email, password, token) {
    return await this.request('POST', '/api/auth/login', { email, password, turnstileToken: token });
  }
  async verifyMagicLink(email, magicLink) {
    return await this.request('POST', '/api/auth/verify-magic-link', { email, magicLink });
  }
  async recordAds() {
    for (let i = 0; i < 40; i++) {
      const res = await this.request('POST', '/api/ads/record', {});
      if (res.status === 200 && res.data?.success) {
        if ((res.data.count || 0) >= 5) return true;
        await sleep(6000);
      } else await sleep(5000);
    }
    return false;
  }
  async applyPremium() {
    const res = await this.request('POST', '/api/generator/apply', {});
    return res.data;
  }
}

// ============================================================
//  MAIN PROCESS
// ============================================================
async function processAccount(email, password, isTempMail = true) {
  const regSolve = await getFreshTurnstileToken(true);
  const client = new AmpremClient(regSolve.cookies);
  const regRes = await client.register(email, password, regSolve.token);
  if (!regRes.data?.success) throw new Error(regRes.data?.error || 'Gagal register');
  await randomDelay();
  const loginSolve = await getFreshTurnstileToken(false);
  loginSolve.cookies.forEach(c => { client.sessionCookies[c.name] = c.value; });
  const loginRes = await client.login(email, password, loginSolve.token);
  if (!loginRes.data?.success) throw new Error(loginRes.data?.error || 'Gagal login');
  await randomDelay();
  const sent = await sendFirebaseVerification(email);
  if (!sent) throw new Error('Gagal kirim verifikasi Firebase');
  let magicLink = '';
  if (isTempMail) {
    magicLink = await pollForLink(email);
    if (!magicLink) throw new Error('Timeout: Link tidak ditemukan');
  }
  const verifyRes = await client.verifyMagicLink(email, magicLink.trim());
  if (!verifyRes.data?.success) throw new Error(verifyRes.data?.error || 'Gagal verifikasi');
  await client.recordAds();
  const applyRes = await client.applyPremium();
  if (applyRes?.success) {
    return { status: true, email, magicLink: magicLink.trim(), codeOrder: applyRes?.data?.codeOrder || null };
  }
  throw new Error(applyRes?.error || 'Gagal apply premium');
}

module.exports = { processAccount, generateEmail, randomString, randomDelay };
