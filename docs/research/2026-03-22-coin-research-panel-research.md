# Research Report: Coin Research Panel

**Date:** 2026-03-22
**Idea source:** `docs/technical_plan.md` — Ideas Under Discussion
**Status:** Draft

---

## 1. Idea Summary

The Coin Research Panel is a contextual side-panel inside the Scriptorium (data entry form) that surfaces numismatic reference data — coin type descriptions, catalog numbers, physical characteristics, obverse/reverse legends — from authoritative sources such as Numista, ANS OCRE, and PCGS CoinFacts, without the collector ever leaving the app. The problem it solves: every collector currently works across 4–6 separate browser tabs or books during a single cataloguing session. For a world/modern coin, they consult Numista for type data, PCGS or NGC for value, and auction archives for comps. For ancient Roman coins, they may also consult OCRE, WildWinds, RIC volumes, and Sear — before transcribing anything into their collection software by hand. This research-to-record gap is universal and entirely unoccupied by any existing desktop tool.

---

## 2. Research Questions

### Q1: Do Numista, PCGS, NGC, or museum databases offer public APIs or embeddable data that could be queried?

**Numista** has a public REST API (`numista.com/api/v3/`). Requires a free API key. Returns structured coin-type JSON: catalog N-number, composition, weight, diameter, shape, orientation (die axis), obverse/reverse descriptions and legends, catalog cross-references (KM, Friedberg, Schön, etc.), mint, and year range. Rate-limited to ~100 requests/day for free non-commercial use; no published paid tier. Images are CDN-hosted — fetchable by URL but not redistributable. Terms prohibit bulk download or mirroring. License: CC BY-NC-SA (non-commercial use acceptable for Patina).

**PCGS** has no general public API. Their CoinFacts database is web-only. A cert verification path exists but requires a commercial business relationship. No coin-type or price-guide API is available.

**NGC** is the same situation as PCGS. Cert verification exists via an unofficial JSON endpoint; no public Coin Explorer API.

**ANS OCRE** (Online Coins of the Roman Empire) is the standout open source. It exposes: individual type records as JSON-LD (append `.jsonld` to any type URL), a SPARQL endpoint for structured queries, and full RDF/TTL data dumps downloadable from the ANS GitHub. License is **CC0 (public domain)**. Coverage: ~50,000 Roman Imperial coin types from Augustus to Zeno (27 BCE–491 CE). This dataset is small enough (~50–200 MB) to bundle locally or sync once.

**ANS CRRO** (Roman Republican Coinage — Crawford) uses the same architecture: JSON-LD per type, SPARQL, downloadable. CC0. **RPC Online** (Oxford) is the same framework. All ANS databases use the Nomisma.org linked open data vocabulary.

**CoinArchives and acsearch.info** are closed subscription services. No programmatic access.

**Colnect** has an API but it is approval-required and not publicly documented. Not practically accessible.

### Q2: How do existing collector tools handle in-app reference lookups during data entry?

No existing desktop tool provides a true real-time reference panel alongside data entry. The competitive landscape breaks into three tiers:

- **Static bundled catalogs (EzCoin, CoinManage, Collectors Assistant):** Ship with offline databases cross-referenced to KM numbers. The user browses the catalog to find a type, selects it, and fields auto-populate. No internet required. This is the dominant desktop pattern — but catalogs are frozen between software updates and do not cover ancient coins well.

- **Cert-number autofill (MyCoinWorX, NIM, CoinManage):** Enter a PCGS or NGC certification number; the app fetches grade, type, and images automatically. This is the most-cited differentiating feature in coin collection software reviews. Proven demand — but only works for professionally graded, slabbed coins.

- **Embedded webview (Nexus Coin):** Opens numista.com inside the app as an iframe. The collector still operates two separate surfaces; no data flows from the web view into the form fields. This is the closest existing approximation of the feature — but it is essentially a browser tab inside a window frame, not an integrated panel.

The gap — a panel that fetches structured reference data from an API and stages specific field suggestions for the collector to accept — is unoccupied by any current product.

### Q3: What do collectors say about context-switching pain, and which references do they consult most?

The pain is real but normalised. Collectors describe operating across 4–6 separate surfaces during cataloguing as standard procedure, not as a named frustration. The signal appears not in explicit feature requests but in workflow descriptions:

- *"Numismatists packed multiple volumes of Roman Imperial Coinage (RIC) and hoped they had chosen the right ones for the material likely to appear."* — CoinWeek, describing the pre-OCRE workflow. The browser-tab version of this is the current reality.
- *"For beginners unfamiliar with ancients, attribution can seem intimidating, and depending on your level of dedication, it could take hours of time scrolling through databases while attempting to find similar pieces."* — NumisWiki, Roman Coin Attribution 101.
- *"PCGS CoinFacts has no inventory management… use both for best results."* — MyCoinWorX, explicitly acknowledging the two-app norm.

Community-cited references by frequency: **Numista** (world/modern), **PCGS CoinFacts** (US coins, values), **OCRE** (Roman Imperial), **WildWinds** (ancients, legend lookup), **ForumAncientCoins/NumisWiki** (attribution help), **Heritage/Stack's Bowers** (auction comps), **RIC/Sear/Van Meter** (reference books, increasingly replaced by online equivalents).

Ancient coin collectors are the highest-pain segment: attribution of a single coin may require consulting all of the above, and no autofill path exists for unslabbed coins.

### Q4: Can reference data be cached or bundled locally, preserving offline-first architecture?

**ANS OCRE/CRRO/PELLA:** Yes — full data dumps available, CC0, practical to bundle as a local SQLite snapshot. ~50k Roman Imperial types. This enables zero-latency offline lookup for ancient coins with no network required.

**Numista:** No. ToS prohibits bulk download. However, per-lookup results can be cached locally (SQLite `reference_cache` table keyed by catalog number, with a TTL). After the first fetch, subsequent lookups for the same type are served from cache. The collector needs an API key; this is their own credential, no data about their collection leaves the device.

**PCGS/NGC:** No offline path. Should be surfaced as an external link only (open system browser). No programmatic data access.

This means the feature degrades gracefully: ancient coin collectors get instant offline lookup from the bundled ANS dataset; world/modern collectors get on-demand Numista lookup (online) with local caching.

### Q5: Do any tools auto-populate form fields from reference lookups, and what UX patterns work?

The PCGS/NGC cert-number autofill is the only proven auto-populate pattern in the market — and it is the single most-cited differentiating feature in coin software reviews. For raw/ungraded coins, auto-populate does not exist anywhere.

Analogous patterns from comparable desktop tools (Zotero, MusicBrainz Picard, MacFamilyTree):

- **Staged suggestions, not auto-commit.** Zotero: fetches metadata, displays it in a staging panel, user confirms before it enters the library. MusicBrainz Picard: diff-style panel (current tags left, proposed right), user drags to apply. Both treat the lookup result as a proposal, not a write.
- **Explicit trigger.** Lookup fires only when the user clicks a button — never on keypress or in the background.
- **No collection data in the outbound request.** The API call contains only the catalog number string. The user's coin records and collection metadata never leave the device.
- **Graceful degradation.** If offline or rate-limited, the feature simply shows an error state; data entry continues without it.

---

## 3. Competitive Landscape

| Tool | Approach | What works | What's missing |
|---|---|---|---|
| EzCoin | Offline static KM-cross-referenced catalog; browse to select type, auto-fill fields | Works without internet; proven field-population pattern | Catalog is frozen between updates; no ancient coin coverage; no API integration |
| CoinManage | Bundled Krause Standard Catalog (~200k types); PCGS cert-number autofill | Most complete offline catalog; cert autofill is fast | World coin coverage uneven; no ancient coins; no live lookup |
| MyCoinWorX (web) | PCGS/NGC cert-number import; cloud-based | Autofill from cert is excellent; clean UX | Web-only (not desktop); no raw coin lookup; no ancient coins |
| NIM | PCGS/NGC cert-number autofill | Same as MyCoinWorX | Same limitations |
| Nexus Coin | Embedded webview to numista.com | At least keeps researcher in one window | No data flow from webview to form; still two separate surfaces |
| OpenNumismat | OSS; fetches Numista images on demand; local SQLite | Open source; customisable | No in-form reference panel; lookup is image-only, not field data |
| Collectors Assistant | Offline static catalog; catalog browser next to entry form | Side-by-side layout concept is sound | No internet integration; dated UI; no ancient coverage |

**Additional notes:** No tool in this survey provides a structured, live reference panel that (a) queries an external API, (b) displays coin-type data alongside the entry form, and (c) allows the collector to selectively apply field values from the reference to their record. This combination is the specific gap.

---

## 4. Community Signals

- **NumisWiki (ForumAncientCoins):** *"For beginners unfamiliar with ancients, attribution can seem intimidating, and depending on your level of dedication, it could take hours of time scrolling through databases while attempting to find similar pieces."* — Direct voice on the time cost of external lookups.

- **CoinWeek (on OCRE):** *"Identifying Roman imperial coins generally has become even easier without the need to thumb through the pages of RIC and flip back-and-forth to look at plates."* — The "flip back-and-forth" maps directly to the browser-tab experience collectors still face with online databases.

- **MyCoinWorX (vendor acknowledgement):** *"PCGS CoinFacts has no inventory management… use both for best results."* — A vendor explicitly confirming the two-app norm as the accepted workflow.

- **Numista forum (admin Xavier on import):** *"It would be quite complex to build an import tool, with no chance to have it 100% reliable, and therefore there are no plans to add the possibility to import from a file."* — A community workaround (NumistaImporter on GitHub) emerged in direct response. Third-party workaround tools are a strong signal of unmet demand.

- **MyCoinWorX on cert autofill:** *"Import your coin's PCGS or NGC certification number and MyCoinWorX automatically fills in the coin's details, grade, and images — eliminating manual data entry."* — The most commercially differentiated feature in this market is the one that removes research-to-record transcription.

- **CoinTalk / Collectors Universe (collector-described workflows):** Collectors describe manually maintaining Excel columns for "region, metal type, denomination, year range, emperor, legends, mint information, references" — each field copied from a separate browser tab. This is treated as normal, not as a problem to be solved.

- **NumisWiki (attribution workflow):** *"Moneta or other software, RIC, Sear, Van Meter or other books, and websites like the FORVM, WildWinds, Dirty Old Coins"* — confirming multi-source lookup is the norm for even a single ancient coin attribution.

---

## 5. Relevant Standards

**Catalog numbering formats (relevant to lookup routing):**

| Prefix | Catalog | Format | Lookup target |
|---|---|---|---|
| `N# 12345` | Numista | Plain integer | Numista REST API |
| `KM 47` | Krause-Mishler | Free text | Via Numista `references` array |
| `RIC I Augustus 15` | Roman Imperial Coinage | `RIC {vol}({ed}). {emperor}. {num}{variant}` | ANS OCRE (JSON-LD / SPARQL) |
| `RRC 494/32` / `Crawford` | Roman Republican | `{number}/{variant}` always two-part | ANS CRRO |
| `RPC I 4567` | Roman Provincial | `RPC {vol} {number}` | RPC Online (Oxford, Nomisma) |
| `PCGS# 3972` | PCGS CoinFacts | 6-digit integer | External link only |
| `Fr. 15` | Friedberg (gold) | Free text | Via Numista references; no direct API |

**RIC uniqueness caveat:** RIC numbers are not globally unique — the same integer appears across volumes and emperors. A valid lookup always requires volume + emperor + number. The OCRE URI encoding (`ric.1(2).aug.1A`) handles this correctly.

**Privacy implications:** The feature involves outbound HTTP requests to Numista's API. Privacy constraints that must be respected:
1. The outbound request payload must contain **only the catalog number string** — never collection metadata, user identity, or coin records.
2. The feature must be **user-initiated** (explicit "Look up" trigger), never automatic or background-running.
3. The user must supply their own Numista API key (stored in Patina's local preferences, never transmitted to any Patina server — there is no Patina server).
4. The feature must degrade gracefully when offline. Data entry is never blocked by lookup availability.
5. For the ANS bundled dataset (OCRE/CRRO), no network request is needed — this can be distributed with CC0 attribution.

---

## 6. Open Questions

- [ ] **API key UX:** How does the collector obtain and enter a Numista API key? A settings screen with a direct link to numista.com/api/doc/ and a test button? First-run onboarding? This needs a UI design decision.
- [ ] **Bundled ANS dataset: shipping or first-run download?** The OCRE/CRRO dataset (~50–200 MB RDF) could be bundled with the app (increases installer size) or downloaded once on first use with user consent. The download path is more privacy-transparent but adds friction. Decision required.
- [ ] **Field mapping:** Which Numista API fields map to which Patina fields? Numista's `composition` is an object (`base_metal` + `fineness`); Patina's `metal` is a vocab field. The mapping may not be 1:1 for all fields. A mapping table needs to be designed before implementation.
- [ ] **Staged suggestion UX:** When reference data is fetched, how does the panel present it? Does it show all fields and let the collector check boxes? Does it only show fields that differ from what the collector has already entered? This is a significant UX design question — the `/curating-ui` skill should be activated for it.
- [ ] **Cache TTL and invalidation:** How long should fetched Numista type records be cached? 30 days is a reasonable default, but if Numista updates a type record, the cached version becomes stale. Should the user be able to force-refresh?
- [ ] **Scope of bundled ANS data:** OCRE covers Roman Imperial only. Does Patina's target collector also want CRRO (Republican) and RPC (Provincial)? What about Greek coins (no comparable open dataset)? Scope of the initial bundle needs agreement.
- [ ] **Panel placement in Scriptorium:** Where does the panel live? As a collapsible right-hand drawer? A bottom panel? Triggered by a search field at the top of the Scriptorium? This is an architectural question for the Scriptorium layout.

---

## 7. Directional Recommendation

**Verdict: Ready for blueprint**

The research confirms strong collector demand, a clear and unoccupied market position, two distinct and technically viable data paths (ANS CC0 bundled for ancient coins; Numista API with local caching for world/modern coins), and proven UX precedents from analogous reference-manager tools. The privacy constraints are tractable: outbound requests carry only a catalog number string, are user-triggered, and require the user's own API key. No Patina data ever leaves the machine.

The blueprint architect should respect three key constraints: (1) the lookup is always additive — data entry must be fully functional with the panel absent or offline; (2) reference results are staged as suggestions, never auto-committed to the coin record; (3) the ANS dataset bundle is the right first scope — it is CC0, finite in size, covers the highest-pain collector segment (ancient Roman), and requires no API key, making it the zero-friction entry point for the feature.

Activate `/curating-blueprints` next, referencing this report in Phase 0. The `/curating-ui` skill should be engaged early for the staged-suggestion panel UX, as this is the design-critical interaction in the feature.

---

*If proceeding: activate `/curating-blueprints` and reference this report in Phase 0.*
