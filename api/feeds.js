// Public feeds the events route reads. All are open RSS or Atom endpoints.
// Grouped only so the list stays readable; the route treats them as one pile.
export const FEEDS = [
  // Wires and broad world desks
  { source: "AP", url: "https://feedx.net/rss/ap.xml" },
  { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { source: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "CNBC World", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362" },
  { source: "DW", url: "https://rss.dw.com/rdf/rss-en-world" },
  { source: "France 24", url: "https://www.france24.com/en/rss" },
  { source: "Guardian World", url: "https://www.theguardian.com/world/rss" },
  { source: "NPR World", url: "https://feeds.npr.org/1004/rss.xml" },
  { source: "Sky News World", url: "https://feeds.skynews.com/feeds/rss/world.xml" },

  // Europe and policy
  { source: "Euractiv", url: "https://www.euractiv.com/feed/" },
  { source: "EU Commission", url: "https://ec.europa.eu/commission/presscorner/api/rss?language=en" },
  { source: "Politico EU", url: "https://www.politico.eu/feed/" },

  // Asia and the Gulf
  { source: "Al Arabiya", url: "https://english.alarabiya.net/tools/rss" },
  { source: "Nikkei Asia", url: "https://asia.nikkei.com/rss/feed/nar" },
  { source: "SCMP China", url: "https://www.scmp.com/rss/4/feed" },
  { source: "The Diplomat", url: "https://thediplomat.com/feed/" },
  { source: "Times of India World", url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms" },

  // Conflict and defence
  { source: "Breaking Defense", url: "https://breakingdefense.com/feed/" },
  { source: "Defense News", url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml" },
  { source: "Kyiv Independent", url: "https://kyivindependent.com/feed/" },
  { source: "War on the Rocks", url: "https://warontherocks.com/feed/" },

  // Energy, resources, shipping, trade
  { source: "Mining.com", url: "https://www.mining.com/feed/" },
  { source: "OilPrice", url: "https://oilprice.com/rss/main" },
  { source: "Splash 247", url: "https://splash247.com/feed/" },
  { source: "World Bank", url: "https://www.worldbank.org/en/news/all?format=rss" },

  // Technology and semiconductors
  { source: "EE Times", url: "https://www.eetimes.com/feed/" },
  { source: "The Register", url: "https://www.theregister.com/headlines.atom" },
  { source: "TechCrunch", url: "https://techcrunch.com/feed/" },
];
