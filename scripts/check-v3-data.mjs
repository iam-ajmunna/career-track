import { registry } from "../src/v3/catalog.js";
import { globalCounts } from "../src/v3/domain.js";
import { emptyState } from "../src/v3/store.js";
console.log(
  JSON.stringify(
    {
      schema: registry.schemaVersion,
      opportunities: registry.opportunities.length,
      sources: registry.sources.length,
      researchGroups: registry.research.length,
      countries: registry.countries.length,
      atAudit: globalCounts(
        registry,
        emptyState(),
        Date.parse("2026-10-16T12:00:00Z"),
      ),
    },
    null,
    2,
  ),
);
