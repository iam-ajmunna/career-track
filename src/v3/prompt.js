export function researchPrompt(o, registry) {
  const sources = registry.sources.filter((s) => o.sourceIds.includes(s.id));
  return `Research and verify only ${o.name} for ${o.intakes.join(", ")}. Checked dataset: ${o.verification.checkedAt}. Current certainty: ${o.verification.state}.\n\nOfficial starting points:\n${sources.map((s) => s.url).join("\n")}\n\nVerify the current application window, all admission/scholarship/nomination/referee deadlines with original local time, timezone and precision. Confirm Bangladesh/international eligibility, subject prerequisites and degree equivalence. Separate admission from funding. Itemise tuition, stipend, insurance, fees, living costs, conditional assistantships and return-home obligations. Do not reuse prior-year dates as current facts.\n\nBuild a sourced application playbook with portals, chronological steps, document formats/limits/attestation, referees, English tests, essays/proposals, supervisor or nomination dependencies, critical path and rejection traps. Mark anything unconfirmed. Distinguish official rules from firsthand experience. Research direction: computer vision, efficient neural networks, multimodal representation learning and AI systems. Never invent achievements or publications. Do not infer any personal application stage or include private correspondence.\n\nKnown unresolved items:\n${o.guide.unconfirmed.map((x) => "- " + x).join("\n")}\nFunding classification: ${o.funding.classification}. ${o.funding.summary}`;
}
export function applicationPackage(o, registry, state, intake) {
  const application = state.v3.applications[`${o.id}:${intake}`] || {};
  return `# ${o.name} — ${intake} application package\n\nPrivate device export: ${new Date().toISOString()}\nStage: ${application.stage || "not-started"}\nDecision: ${application.decision || "research"}\n\n## Official research prompt\n${researchPrompt(o, registry)}\n\n## Application steps\n${o.guide.steps.map((s) => `- [${application.completedSteps?.[s.id] || (s.legacyKey && state.progress[s.legacyKey]) ? "x" : " "}] ${s.text}`).join("\n")}\n\n## Documents\n${o.guide.documents.map((d) => `- ${d.name}: ${d.required ? "required" : "optional"}; ${d.limit}; ${d.method}`).join("\n")}\n\n## Writing plan\n${o.guide.essays.map((e) => `- ${e.name}: ${e.limit}. ${e.purpose} ${e.evidence}`).join("\n")}\n\n## Private notes\n${state.notes?.[o.id] || "(none)"}\n\n## Deadlines\n${registry.deadlines
    .filter((d) => d.opportunityId === o.id && d.intake === intake)
    .map(
      (d) =>
        `- ${d.title}: ${d.at || d.date || "unconfirmed"} (${d.precision}). ${d.action}`,
    )
    .join("\n")}\n`;
}
