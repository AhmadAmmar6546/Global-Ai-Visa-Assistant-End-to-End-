# Source governance

Requirements are jurisdiction-sensitive facts. A link to a government publisher does not prove that the app extracted or reviewed a specific instruction. This release ships publisher links and clearly marked demonstration checklists; it does not ship a claim that the seeded rules are legally current.

## Registered publishers

| Destination | Publisher | Registry link |
| --- | --- | --- |
| Italy | Ministry of Foreign Affairs | <https://vistoperitalia.esteri.it/home/en> |
| Germany | Federal Foreign Office | <https://www.auswaertiges-amt.de/en/visa-service/buergerservice/faq/08-studentenvisum/606690> |
| United Kingdom | GOV.UK | <https://www.gov.uk/student-visa> |
| Canada | IRCC | <https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html> |
| Australia | Department of Home Affairs | <https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500> |

The server requires the exact registered URL and matching destination for approval. Adding a legitimate publisher or a changed official URL is an explicit registry/code review. Arbitrary pasted URLs do not become official because they look like a government domain.

## Reviewer workflow

1. Open the official link independently. Confirm the publisher, current page, applicant profile, and local consular coverage. Follow the authority's local instructions; a global study page can be incomplete for a specific nationality or jurisdiction.
2. Record the relevant official text through the reviewer source snapshot action. Confirm its official origin; the app stores the capture timestamp and SHA-256 checksum. The server does not fetch the URL or independently prove that the pasted text came from it.
3. Create a new draft for the exact destination, nationality, residence, jurisdiction, and visa type. Supply a concise requirement description and an exact supporting excerpt of at least 40 characters present in the recorded snapshot.
4. Compare the complete rule and excerpt to the official page. Approve with a future expiry within one year, or reject the draft. A checksum verifies snapshot consistency, not legal correctness or factual provenance.
5. Inspect the case output for the exact scope, citations, and completeness warning. Record follow-up review work outside the app where appropriate.

Reviewed versions are immutable. To change or withdraw a requirement, create and review a new version with the same scope/title. The newest reviewed version wins; rejecting or expiring it prevents an older approval from silently reappearing. Drafts preserve the last reviewed state until an explicit review decision.

Approval and source replacement use serializable database transactions with atomic audit events. Approval records the source URL, capture time/checksum, and supporting-excerpt checksum that were actually validated. A concurrent replacement either leaves the approval tied to that previous evidence or prevents approval; it cannot relabel the approval with an unchecked newer snapshot. Rule excerpts and approval audit metadata remain immutable when a source is replaced. The source table retains its current snapshot, not a full archive of every historic page; preserving complete historic official material is future work.

Seeded demo rules cannot be approved as official rules. They can appear only in their exact demo scope and retain `DEMO` labels. An applicant selecting **Reviewed** on a checklist item does not perform this reviewer workflow.

## Freshness and limitations

Each approved non-demo rule requires `verifiedAt`, a future `validUntil`, an official source, and exact scope matching. Expired rules disappear from active requirements; if no matching reviewed rules remain, the case becomes `UNKNOWN` unless its exact sample scope has demo records. Rule expiry is enforced on access rather than by a notification worker.

The app has no automatic government crawler, diff queue, retrieval index, second-reviewer requirement, source-content malware scan, or independent provenance certification. A reviewer may approve only some requirements, so `VERIFIED` never means a complete document list, application eligibility, document authenticity, or approval likelihood. Human source knowledge and periodic refresh remain required.

Integration tests use synthetic excerpts under a unique `ZZ` nationality/residence and test jurisdiction to verify software behavior. They restore the source snapshot and remove their rules afterward. These fixtures must never be published as real visa information.
