import sharp from "sharp";

const svg = `<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="23" fill="none" stroke="#c5a059" stroke-width="1.5" opacity="0.4"/>
  <circle cx="24" cy="24" r="23" fill="#c5a059" opacity="0.08"/>
  <ellipse cx="24" cy="22" rx="14" ry="12" fill="#c5a059" opacity="0.6"/>
  <circle cx="24" cy="11" r="6" fill="#c5a059" opacity="0.6"/>
  <line x1="24" y1="5" x2="19" y2="0" stroke="#c5a059" stroke-width="1" opacity="0.35" stroke-linecap="round"/>
  <line x1="24" y1="5" x2="29" y2="0" stroke="#c5a059" stroke-width="1" opacity="0.35" stroke-linecap="round"/>
  <ellipse cx="20" cy="24" rx="2" ry="4" fill="#c5a059" opacity="0.3" transform="rotate(-20 20 24)"/>
  <ellipse cx="28" cy="24" rx="2" ry="4" fill="#c5a059" opacity="0.3" transform="rotate(20 28 24)"/>
</svg>`;

sharp(Buffer.from(svg)).resize(48, 48).png().toFile("public/assets/avatars/avatar-default.png")
  .then(() => console.log("avatar generated"))
  .catch(console.error);
