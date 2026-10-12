import "dotenv/config";
import { db as prisma } from "../src/lib/db";
import { DEMO_REQUIREMENTS, OFFICIAL_SOURCES } from "../src/lib/sources";

async function main() {
  for (const entry of OFFICIAL_SOURCES) {
    const source = await prisma.source.upsert({
      where: { url: entry.url },
      update: {},
      create: { ...entry, official: true, excerpt: "" },
    });
    for (const [index, requirement] of DEMO_REQUIREMENTS.entries()) {
      // Stable IDs make reruns safe without changing reviewer-maintained records.
      const id = `demo-${entry.destination.toLowerCase()}-${index + 1}`;
      await prisma.rule.upsert({
        where: { id },
        update: {},
        create: {
          id,
          sourceId: source.id,
          destination: entry.destination,
          nationality: "PK",
          residence: "PK",
          jurisdiction: "Islamabad",
          visaType: "study",
          ...requirement,
          sourceExcerpt: "DEMONSTRATION ONLY. This sample is not an excerpt from an official source and has not been verified.",
          isDemo: true,
          reviewStatus: "APPROVED",
          verifiedAt: null,
          validUntil: null,
          version: 1,
        },
      });
    }
  }
  console.log("Seeded official-source registry and 20 clearly labelled demonstration rules. No official requirements were verified.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seeding failed");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
