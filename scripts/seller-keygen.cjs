#!/usr/bin/env node
/**
 * ابزار اختصاصی فروشنده جهت تولید کد فعال‌سازی سرور (خارج از برنامه مشتری)
 * این فایل در رابط کاربری مشتری وجود ندارد و فقط دست فروشنده است.
 *
 * نحوه استفاده در CMD یا PowerShell:
 *   node scripts/seller-keygen.cjs AMH-XXXX-XXXX-XXXX
 * یا بدون آرگومان اجرا کنید تا کد سخت‌افزار مشتری را از شما بپرسد.
 */

const readline = require('readline');

const SELLER_MASTER_SECRET = 'ANBARMEH_ERP_WINDOWS_SERVER_MASTER_KEY_2026_#9981_ENTERPRISE';
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function computeDeterministicBytes(input, rounds = 16) {
  const bytes = [];
  for (let r = 0; r < rounds; r++) {
    let h1 = (0x811c9dc5 ^ (r * 0x9e3779b9)) >>> 0;
    let h2 = (0x85ebca6b ^ (r * 0xc2b2ae35)) >>> 0;
    const str = `${SELLER_MASTER_SECRET}::R${r}::${input}::${SELLER_MASTER_SECRET}`;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ ((ch << 5) | (ch >>> 3)), 0x27d4eb2d) >>> 0;
      h1 = ((h1 << 13) | (h1 >>> 19)) ^ h2;
    }
    bytes.push((h1 ^ (h2 >>> 8)) & 0xff);
  }
  return bytes;
}

function generateActivationCodeForHardware(hardwareCode) {
  const cleanHw = String(hardwareCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  const coreHw = cleanHw.startsWith('AMH') ? cleanHw.slice(3) : cleanHw;
  if (!coreHw || coreHw.length < 6) {
    return '';
  }

  const normalizedHw = `AMH-${coreHw.slice(0, 4)}-${coreHw.slice(4, 8)}-${coreHw.slice(8, 12)}`;
  const licenseBytes = computeDeterministicBytes(`SERVER_ACTIVATION_LICENSE::${normalizedHw}`, 16);

  let chars = '';
  for (let i = 0; i < 16; i++) {
    chars += ALPHABET[licenseBytes[i] % ALPHABET.length];
  }

  return `ACT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}-${chars.slice(12, 16)}`;
}

const argHw = process.argv[2];

if (argHw) {
  const actCode = generateActivationCodeForHardware(argHw);
  console.log('\n======================================================');
  console.log('  ANBARMEH ENTERPRISE - SELLER LICENSE GENERATOR');
  console.log('======================================================');
  console.log(`  Customer Hardware Code : ${argHw.trim().toUpperCase()}`);
  console.log(`  Server Activation Code : ${actCode}`);
  console.log('======================================================\n');
  process.exit(0);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n======================================================');
console.log('  ANBARMEH ENTERPRISE - SELLER LICENSE GENERATOR');
console.log('======================================================');
rl.question('Enter Customer Hardware Code (e.g. AMH-XXXX-XXXX-XXXX): ', (answer) => {
  const actCode = generateActivationCodeForHardware(answer);
  if (!actCode) {
    console.error('\n[!] Invalid Hardware Code format.\n');
  } else {
    console.log('\n------------------------------------------------------');
    console.log(`  Customer Hardware Code : ${answer.trim().toUpperCase()}`);
    console.log(`  Server Activation Code : ${actCode}`);
    console.log('------------------------------------------------------\n');
  }
  rl.close();
});
