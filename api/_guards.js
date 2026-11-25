// What the sift claims is checked here rather than trusted. A prompt cannot
// be relied on to hold a long rubric across six hundred headlines, so the
// things it gets wrong in a recognisable way are caught in code.

const INDEXES = new Set([
  "dow", "dow jones", "nasdaq", "s&p", "s&p 500", "sp500", "ftse", "dax",
  "nikkei", "hang seng", "sensex", "cac", "cac 40", "stoxx", "russell",
  "russell 2000", "vix", "wall street", "the market", "markets", "stocks",
  "equities", "investors", "traders", "consumers", "shoppers", "the street",
]);

const COUNTRIES = new Set([
  "us", "u.s.", "usa", "america", "uk", "britain", "eu", "europe", "china",
  "japan", "india", "germany", "france", "korea", "south korea", "north korea",
  "taiwan", "russia", "ukraine", "israel", "iran", "canada", "australia",
  "brazil", "mexico", "singapore", "vietnam", "indonesia", "saudi arabia",
  "netherlands", "italy", "spain", "poland", "turkey", "switzerland",
]);

// A state organ, not a company, even where the name reads like one.
const STATE_BODY = /\b(government|administration|ministry|department|treasury|congress|senate|parliament|commission|regulator|watchdog|agency|authority|army|navy|air ?force|military|pentagon|central bank|federal reserve|the fed|white house|fincen|sec|ftc|doj)\b/i;

// A category of firms rather than a firm.
const VAGUE_TAIL = /\b(makers?|manufacturers?|firms?|companies|producers?|suppliers?|vendors?|operators?|startups?|labs?|lenders?|banks?|retailers?|carriers?|airlines?|executives?|investors?|rivals?|peers?|players?|giants?|hawks?|officials?|cartel|sector|industry|market)$/i;

export function notACompany(name, outlets = new Set()) {
  const key = String(name || "").trim().toLowerCase().replace(/^the\s+/, "");
  if (!key || key.length > 40) return true;
  if (outlets.has(key)) return true; // an outlet, not a subject
  if (INDEXES.has(key)) return true;
  if (COUNTRIES.has(key)) return true;
  if (STATE_BODY.test(key)) return true;
  if (VAGUE_TAIL.test(key)) return true;
  return false;
}

const MOVE =
  "(rise|rises|rose|fall|falls|fell|slide|slides|slid|sink|sinks|sank|jump|jumps|jumped|plunge|plunges|plunged|soar|soars|soared|tumble|tumbles|tumbled|rally|rallies|rallied|gain|gains|gained|drop|drops|dropped|surge|surges|surged|climb|climbs|climbed|slump|slumps|slumped|sliding|falling|rising|jumping)";

// "Dell Technologies stock plunged today"
const PRICE_MOVE = new RegExp(`\\b(stock|shares|share price)\\b[^.]{0,45}\\b${MOVE}\\b`, "i");

// "Nasdaq falls 3% at the open as AI rout intensifies"
const INDEX_MOVE = new RegExp(
  `\\b(dow|nasdaq|s&p|ftse|dax|nikkei|hang seng|wall street|chip stocks|tech stocks|ai stocks|software stocks|semiconductor stocks|markets?)\\b[^.]{0,45}\\b(${MOVE}|rout|selloff|sell-off|rebound|recovery|turns? positive|turns? negative|at the open)\\b`,
  "i"
);

// "AI stock rout deepens", "the AI trade continues to unravel"
const SENTIMENT = /\b(rout|selloff|sell-off|sell off|rebound|recovery|rally)\b[^.]{0,45}\b(deepens?|intensifies|intensified|continues?|unravels?|attempts?|widens?|eases?)\b|\b(trade|rally|run)\b[^.]{0,20}\b(unravels?|unravelling|unraveling)\b/i;

// "Why Sandisk stock fell 34%", "AMD stock could reward patient investors"
const TIP_OR_EXPLAINER =
  /^(why|here'?s why|here is why)\b|\b(explained|what to know|all you need to know|things to know|stock to (buy|watch)|stocks? to (buy|watch)|best stocks?|top stocks?|is it time to|should you (buy|sell))\b|\b(could|will|would|might|may) (reward|make you|turn|double|triple|soar|skyrocket)\b/i;

export function marketNoise(headline) {
  const text = String(headline || "");
  return (
    PRICE_MOVE.test(text) ||
    INDEX_MOVE.test(text) ||
    SENTIMENT.test(text) ||
    TIP_OR_EXPLAINER.test(text)
  );
}
