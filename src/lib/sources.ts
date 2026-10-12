import { createHash } from "node:crypto";

/** Registry links identify the publisher. They are not reviewed visa requirements. */
export const OFFICIAL_SOURCES = [
  {
    destination: "IT",
    title: "Italy — Ministry of Foreign Affairs, Visa for Italy",
    url: "https://vistoperitalia.esteri.it/home/en",
  },
  {
    destination: "DE",
    title: "Germany — Federal Foreign Office, studying in Germany",
    url: "https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq/08-studentenvisum/606690",
  },
  {
    destination: "GB",
    title: "United Kingdom — GOV.UK Student visa",
    url: "https://www.gov.uk/student-visa",
  },
  {
    destination: "CA",
    title: "Canada — IRCC, study permits",
    url: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
  },
  {
    destination: "AU",
    title: "Australia — Department of Home Affairs, Student visa (subclass 500)",
    url: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
  },
] as const;

export function isKnownOfficialSource(destination: string, url: string) {
  return OFFICIAL_SOURCES.some((source) => source.destination === destination && source.url === url);
}

export function sourceChecksum(excerpt: string) {
  return createHash("sha256").update(excerpt, "utf8").digest("hex");
}

export function exactSupportingExcerpt(snapshot: string, excerpt: string) {
  // Whitespace is irrelevant to HTML extraction; the actual words remain exact.
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  return normalize(excerpt).length >= 40 && normalize(snapshot).includes(normalize(excerpt));
}

export const DEMO_REQUIREMENTS = [
  {
    title: "Identity and travel document review",
    description: "Sample task: review your passport details and identity documents. Confirm the actual document list and validity rules with the official authority for your application.",
  },
  {
    title: "Admission and study plan review",
    description: "Sample task: organize your admission documents and explain your study plans. Confirm which admission evidence the official authority requires.",
  },
  {
    title: "Funding evidence review",
    description: "Sample task: organize the evidence of how you plan to fund your studies and living costs. No required amount or acceptable evidence has been verified in this demo.",
  },
  {
    title: "Submission process review",
    description: "Sample task: consult the official authority about the relevant application process, local jurisdiction, fees, and appointments. This demo does not confirm an appointment route or processing time.",
  },
] as const;
