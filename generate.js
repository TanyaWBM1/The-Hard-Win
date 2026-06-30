// The Hard Win — inspirational card generator
// Reads cards.json and turns each entry into a 1080x1080 PNG in /output,
// branded with The Hard Win colors and logo.
// Run with:  node generate.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SIZE = 1080;
const BRAND_GREEN = "#2f6f5e";
const BRAND_GREEN_DARK = "#23534633";
const CREAM = "#f3efe3";
const LOGO = path.join(__dirname, "assets", "thehardwin_profile_circle.png");

const cards = JSON.parse(fs.readFileSync(path.join(__dirname, "cards.json"), "utf8"));
const outDir = path.join(__dirname, "output");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// Simple word-wrap: break a quote into lines of at most maxChars characters
function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildSvg(quote, explanation) {
  // Layout: logo (top) | quote (big) | explanation (small) | divider | tagline (bottom)
  const qLines = wrap(quote, 22);
  const eLines = wrap(explanation || "", 46);
  const Q_LH = 78; // quote line height
  const E_LH = 42; // explanation line height
  const GAP = 54; // space between quote and explanation
  const CENTER_Y = 605; // vertical center of the quote+explanation block

  const blockH = qLines.length * Q_LH + (eLines.length ? GAP + eLines.length * E_LH : 0);
  let cursor = CENTER_Y - blockH / 2;

  const qTspans = qLines
    .map((ln) => {
      cursor += Q_LH;
      return `<tspan x="${SIZE / 2}" y="${cursor - 22}">${escapeXml(ln)}</tspan>`;
    })
    .join("");

  cursor += eLines.length ? GAP : 0;
  const eTspans = eLines
    .map((ln) => {
      cursor += E_LH;
      return `<tspan x="${SIZE / 2}" y="${cursor - 12}">${escapeXml(ln)}</tspan>`;
    })
    .join("");

  const dividerY = cursor + 38;

  return `
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND_GREEN}"/>
      <stop offset="100%" stop-color="#234d41"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect x="44" y="44" width="${SIZE - 88}" height="${SIZE - 88}" rx="28"
        fill="none" stroke="${CREAM}" stroke-opacity="0.35" stroke-width="2"/>
  <text text-anchor="middle" font-family="Georgia, serif" font-size="60"
        font-weight="bold" fill="${CREAM}">${qTspans}</text>
  <text text-anchor="middle" font-family="Arial, sans-serif" font-size="30"
        fill="${CREAM}" opacity="0.82">${eTspans}</text>
  <line x1="${SIZE / 2 - 55}" y1="${dividerY}" x2="${SIZE / 2 + 55}" y2="${dividerY}"
        stroke="${CREAM}" stroke-opacity="0.45" stroke-width="3"/>
  <text x="${SIZE / 2}" y="${SIZE - 80}" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="30" fill="${CREAM}"
        letter-spacing="6" opacity="0.85">REAL PEOPLE &#183; REAL PROOF</text>
</svg>`;
}

async function run() {
  // Prepare a small circular logo badge for the top of each card
  const logoSize = 150;
  const logoBuf = await sharp(LOGO).resize(logoSize, logoSize).png().toBuffer();

  for (const card of cards) {
    const svg = buildSvg(card.quote, card.explanation);
    const file = path.join(outDir, `card-${card.id}.png`);
    await sharp(Buffer.from(svg))
      .composite([{ input: logoBuf, top: 130, left: (SIZE - logoSize) / 2 }])
      .png()
      .toFile(file);
    console.log("Created:", file);
  }
  console.log(`\nDone. ${cards.length} card(s) in the 'output' folder.`);
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
