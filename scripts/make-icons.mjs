// 生成 PWA 图标
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

const svg = (size, maskable = false) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <radialGradient id="g" cx="50%" cy="65%" r="55%">
      <stop offset="0%" stop-color="#E8C39E" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#1B1A1F" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" ${maskable ? `rx="${size * 0.22}"` : `rx="${size * 0.18}"`} fill="#1B1A1F"/>
  <ellipse cx="${size/2}" cy="${size * 0.68}" rx="${size * 0.36}" ry="${size * 0.36}" fill="url(#g)"/>
  <!-- candle body -->
  <rect x="${size * 0.44}" y="${size * 0.32}" width="${size * 0.12}" height="${size * 0.36}" rx="${size * 0.02}" fill="#947D75"/>
  <!-- flame outer -->
  <path d="M${size/2} ${size * 0.10} C${size * 0.42} ${size * 0.20}, ${size * 0.42} ${size * 0.28}, ${size/2} ${size * 0.34} C${size * 0.58} ${size * 0.28}, ${size * 0.58} ${size * 0.20}, ${size/2} ${size * 0.10} Z" fill="#E8C39E"/>
  <!-- flame inner -->
  <path d="M${size/2} ${size * 0.18} C${size * 0.46} ${size * 0.24}, ${size * 0.46} ${size * 0.28}, ${size/2} ${size * 0.32} C${size * 0.54} ${size * 0.28}, ${size * 0.54} ${size * 0.24}, ${size/2} ${size * 0.18} Z" fill="#6A080E" opacity="0.85"/>
</svg>`;

async function gen() {
  await mkdir('public/icons', { recursive: true });

  const sizes = [
    { name: 'icon-192.png', size: 192, mask: false },
    { name: 'icon-512.png', size: 512, mask: false },
    { name: 'icon-512-maskable.png', size: 512, mask: true },
    { name: 'apple-touch-icon.png', size: 180, mask: false },
  ];

  for (const s of sizes) {
    const buf = Buffer.from(svg(s.size, s.mask));
    await sharp(buf).png().toFile(path.join('public/icons', s.name));
    console.log(`✓ ${s.name} (${s.size}×${s.size}${s.mask ? ', maskable' : ''})`);
  }
}

gen().catch((e) => {
  console.error(e);
  process.exit(1);
});
