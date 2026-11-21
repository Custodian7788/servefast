// A level is one step of a funnel: a question, claims you judge one at a time,
// and an output that the next level takes as its input. Nothing here knows
// anything about investing - that lives in the level's content, not the engine.

export const LEVEL = {
  id: "geopolitics",
  step: 1,
  of: 4,
  question: "Which geopolitical forces are reshaping industries right now?",
  outputLabel: "Industries to look at next",
  outputHint: "The shortlist this level hands to the next one",
};

// Starter claims to judge. These stand in for what the engine will later
// propose, so the mechanic can be worked through today.
export const STARTER_CLAIMS = [
  "Governments are treating chips, batteries and medicines as strategic goods, and subsidising production inside their own borders rather than buying wherever is cheapest.",
  "Companies are holding larger inventories and running second suppliers in other countries, which costs margin but lowers the chance of a line stopping.",
  "Export controls now cover whole categories of technology, so a firm's addressable market can shrink by government decision rather than by competition.",
  "Energy is priced politically as well as commercially: where a country buys its gas and power is now a security question, not only a cost one.",
  "Defence budgets across Europe are rising from a low base, and procurement cycles are long, so the spending commits years ahead.",
  "Shipping routes are being re-drawn around conflict zones, adding weeks and cost to some lanes and leaving others busier than before.",
  "Critical minerals are concentrated in a few countries, and processing is concentrated further still, which gives those states leverage well beyond their size.",
  "Rules on data and AI increasingly differ by bloc, so products must be built differently for each market rather than shipped once worldwide.",
];

export function makeClaims(texts) {
  return texts.map((text, i) => ({ id: `c${i + 1}`, text, status: "pending" }));
}

export const EMPTY_STATE = {
  claims: makeClaims(STARTER_CLAIMS),
  output: "",
};
