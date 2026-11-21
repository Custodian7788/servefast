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
  };
}

// Older modules were built around steps; keep them openable.
export function normalise(module) {
  if (module.panels) return module;
  const panels = (module.steps || []).map((s) => ({
    id: s.id || newId("p"),
    title: s.title || "",
    body: [s.question, ...(s.claims || []).filter((c) => c.status === "kept").map((c) => `- ${c.text}`)]
      .filter(Boolean)
      .join("\n"),
  }));
  return {
    ...module,
    panels: panels.length ? panels : [makePanel()],
    output: module.steps?.map((s) => s.output).filter(Boolean).join("\n") || "",
  };
}
