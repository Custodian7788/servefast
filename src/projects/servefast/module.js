// A module is one subject you are working on. Inside it sits a grid of
// panels, each one a piece of the thinking - background, analysis, a list of
// candidates, whatever the subject needs - and underneath them the output
// the whole module is driving at.

export function newId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makePanel(title = "") {
  return { id: newId("p"), title, body: "" };
}

export function makeModule({ field = "", goal = "" } = {}) {
  return {
    id: newId("mod"),
    field,
    goal,
    createdAt: Date.now(),
    panels: [makePanel()],
    output: "",
    instructions: "",
  };
}
