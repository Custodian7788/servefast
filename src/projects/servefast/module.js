// A module is one subject you are learning, shaped as a funnel: a handful of
// steps, each narrowing the field, each handing its output to the next.
// Nothing in here knows anything about any particular subject.

export function newId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeStep(title, question, outputLabel) {
  return {
    id: newId("step"),
    title,
    question,
    outputLabel,
    claims: [], // { id, text, status: pending | kept | binned }
    output: "",
  };
}

// The starting funnel. It is only a suggestion: steps can be renamed, removed
// or added before any work begins.
export function makeModule({ field, goal }) {
  return {
    id: newId("mod"),
    field,
    goal,
    createdAt: Date.now(),
    currentStep: 0,
    steps: [
      makeStep("Landscape", `What forces are shaping ${field} right now?`, "Areas worth a closer look"),
      makeStep("Narrowing", "Which of those areas deserve real attention, and why?", "The shortlist"),
      makeStep("Testing", "What would have to be true for each one to work out?", "What survives the test"),
      makeStep("Deciding", `What do I do about it, given the goal: ${goal}?`, "The decision"),
    ],
  };
}

export function addClaim(step, text) {
  return { ...step, claims: [...step.claims, { id: newId("c"), text, status: "pending" }] };
}

export function setClaimStatus(step, id, status) {
  return { ...step, claims: step.claims.map((c) => (c.id === id ? { ...c, status } : c)) };
}

export const pendingOf = (step) => step.claims.filter((c) => c.status === "pending");
export const keptOf = (step) => step.claims.filter((c) => c.status === "kept");
