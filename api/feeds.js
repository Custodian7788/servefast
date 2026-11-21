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

  // Added from the user's own reading list, each one checked for a live feed
  { source: "ABC Australia", url: "https://www.abc.net.au/news/feed/51120/rss.xml" },
  { source: "Barron's", url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain" },
  { source: "Channel News Asia", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml" },
  { source: "Christian Science Monitor", url: "https://rss.csmonitor.com/feeds/world" },
  { source: "Common Dreams", url: "https://www.commondreams.org/feeds/news.rss" },
  { source: "Democracy Now", url: "https://www.democracynow.org/democracynow.rss" },
  { source: "Der Spiegel", url: "https://www.spiegel.de/international/index.rss" },
  { source: "Die Zeit", url: "https://newsfeed.zeit.de/index" },
  { source: "Euronews", url: "https://www.euronews.com/rss?level=theme&name=news" },
  { source: "Fast Company", url: "https://www.fastcompany.com/latest/rss" },
  { source: "FT", url: "https://www.ft.com/rss/home" },
  { source: "Geopolitical Monitor", url: "https://www.geopoliticalmonitor.com/feed/" },
  { source: "Global News", url: "https://globalnews.ca/feed/" },
  { source: "Google News", url: "https://news.google.com/rss" },
  { source: "Handelsblatt", url: "https://www.handelsblatt.com/contentexport/feed/schlagzeilen" },
  { source: "Independent", url: "https://www.independent.co.uk/news/world/rss" },
  { source: "Markets Insider", url: "https://markets.businessinsider.com/rss/news" },
  { source: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories" },
  { source: "Mirror", url: "https://www.mirror.co.uk/news/?service=rss" },
  { source: "Mother Jones", url: "https://www.motherjones.com/feed/" },
  { source: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { source: "Raw Story", url: "https://www.rawstory.com/feed/" },
  { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml" },
  { source: "Seeking Alpha", url: "https://seekingalpha.com/market_currents.xml" },
  { source: "Sifted", url: "https://sifted.eu/feed" },
  { source: "Sydney Morning Herald", url: "https://www.smh.com.au/rss/feed.xml" },
  { source: "Süddeutsche", url: "https://rss.sueddeutsche.de/rss/Topthemen" },
  { source: "Tech Funding News", url: "https://techfundingnews.com/feed/" },
  { source: "The Economist", url: "https://www.economist.com/finance-and-economics/rss.xml" },
  { source: "The Moscow Times", url: "https://www.themoscowtimes.com/rss/news" },
  { source: "The Motley Fool", url: "https://www.fool.com/feeds/index.aspx" },
  { source: "The Seattle Times", url: "https://www.seattletimes.com/feed/" },
  { source: "The Sun", url: "https://www.thesun.co.uk/feed/" },
  { source: "TheStreet", url: "https://www.thestreet.com/.rss/full/" },
  { source: "Time", url: "https://time.com/feed/" },
  { source: "TZ München", url: "https://www.tz.de/rssfeed.rdf" },
  { source: "Vox", url: "https://www.vox.com/rss/index.xml" },
  { source: "Washington Post", url: "https://feeds.washingtonpost.com/rss/world" },
  { source: "Washington Times", url: "https://www.washingtontimes.com/rss/headlines/news/world/" },
  { source: "WELT", url: "https://www.welt.de/feeds/latest.rss" },
  { source: "Wired", url: "https://www.wired.com/feed/rss" },
  { source: "WSJ World", url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews" },
];
