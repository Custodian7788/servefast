// Feeds and pages are full of escaped characters, and some are escaped twice,
// so "Huang&#x27;s" reaches the screen intact. Decode named and numeric forms,
// including hex, and keep going until nothing changes.

const NAMED = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  ensp: " ",
  emsp: " ",
  thinsp: " ",
  shy: "",
  zwnj: "",
  zwj: "",
  ndash: "-",
  mdash: " - ",
  minus: "-",
  hellip: "...",
  middot: "·",
  bull: "·",
  lsquo: "'",
  rsquo: "'",
  sbquo: "'",
  ldquo: '"',
  rdquo: '"',
  bdquo: '"',
  laquo: '"',
  raquo: '"',
  deg: "°",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "c",
  trade: "",
  reg: "",
  copy: "",
  dagger: "",
  Dagger: "",
  permil: "%",
  prime: "",
  Prime: "",
  times: "x",
  divide: "/",
  frac12: "1/2",
  frac14: "1/4",
  frac34: "3/4",
};

export function decode(value = "") {
  let out = String(value);
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out;
    out = out
      .replace(/&#[xX]([0-9a-fA-F]+);/g, (whole, hex) => {
        const code = parseInt(hex, 16);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
      })
      .replace(/&#(\d+);/g, (whole, num) => {
        const code = Number(num);
        return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
      })
      .replace(/&([a-zA-Z][a-zA-Z0-9]{1,9});/g, (whole, name) => {
        const hit = NAMED[name] ?? NAMED[name.toLowerCase()];
        return hit === undefined ? whole : hit;
      });
    if (out === before) break;
  }
  return out;
}
