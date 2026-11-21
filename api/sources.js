import { FEEDS } from "./feeds.js";

// The feeds the events route reads, so the app can show them.
export default function handler(request, response) {
  response.status(200).json({
    sources: FEEDS.map(({ source, url }) => ({ source, url })),
  });
}
