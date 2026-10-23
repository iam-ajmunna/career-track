import { mkdir, readFile, writeFile } from "node:fs/promises";
export function splitOpportunity(o, sources = []) {
  const { guide, ...index } = o;
  return {
    index: {
      ...index,
      officialUrl:
        guide.portals?.[0]?.url ||
        sources.find((s) => o.sourceIds.includes(s.id))?.url ||
        null,
      guide: {
        steps: guide.steps,
        unconfirmed: guide.unconfirmed,
        supervisor: { requirement: guide.supervisor.requirement },
        english: { status: guide.english.status },
      },
      documentIndex: guide.documents.map((d, i) => ({
        name: d.name,
        required: d.required,
        index: i,
      })),
    },
    guide,
  };
}
export async function prepareV4Registry(outdir) {
  const items = JSON.parse(
    await readFile("data/v3/opportunities.json", "utf8"),
  );
  const sources = JSON.parse(await readFile("data/v3/sources.json", "utf8"));
  await mkdir(".generated/v4", { recursive: true });
  await mkdir(outdir + "/data/v4/guides", { recursive: true });
  const split = items.map((o) => splitOpportunity(o, sources));
  await writeFile(
    ".generated/v4/opportunities.index.json",
    JSON.stringify(split.map((x) => x.index)),
  );
  await Promise.all(
    items.map((o, i) =>
      writeFile(
        outdir + "/data/v4/guides/" + o.id + ".json",
        JSON.stringify(split[i].guide),
      ),
    ),
  );
  await writeFile(
    outdir + "/data/v4/opportunities.index.json",
    JSON.stringify(split.map((x) => x.index)),
  );
}
