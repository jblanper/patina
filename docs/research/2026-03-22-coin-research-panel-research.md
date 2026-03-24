# Research Report: Coin Research Panel

**Date:** 2026-03-22
**Updated:** 2026-03-23 — Open questions resolved; field mapping table added
**Idea source:** `docs/technical_plan.md` — Ideas Under Discussion
**Status:** Proposed

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

## 6. Open Questions — Resolved

All seven questions below were open as of the initial draft. Additional research (2026-03-23) has resolved each one. The field mapping detail is in Section 8.

- [x] **API key UX:** A dedicated **Preferences screen** (accessible from the existing `Personalizar` menu, or the `Herramientas ▾` dropdown in the Cabinet Command Strip) should hold the Numista API key field. The input has two affordances: a **"Test connection"** button (calls `GET /v3/search_coins?q=test&api_key=…` and shows a success/failure badge), and a **"Get a key →"** link that opens `en.numista.com/api/doc/index.html` in the system browser. The key is stored in the existing `preferences` SQLite table (`key: 'numista_api_key'`). The panel does **not** block first-run — if no key is configured, the Numista search area shows a "Configure API key in Preferences" inline prompt. The API key flow belongs in a preferences UI, not onboarding, because the feature is optional and used only when the collector initiates it.

- [x] **Bundled ANS dataset: ship with the app.** The raw RDF/TTL dumps from ANS GitHub (CC0) are verbose at 50–200 MB uncompressed, but when pre-processed at build time into a purpose-built SQLite file (only the fields Patina needs: type ID, catalog ref, authority, mint, date range, metal, weight, diameter, obverse/reverse description and legend), the bundle is approximately **15–35 MB compressed**. This is an acceptable installer cost for a desktop app and preserves offline-first without any user friction or consent prompt. The blueprint should specify a build-time conversion script (`scripts/build-ans-bundle.cjs`) that downloads the latest CC0 dumps, extracts the relevant Nomisma.org triples, and emits `data/ans-catalog.db`. The bundled file ships in `resources/` and is copied to the user data dir on first launch.

- [x] **Field mapping:** See Section 8 for the full table. The key non-obvious decisions: (1) Numista's `composition.text` is the only available metal description — it is a free-text string ("Copper-nickel") that must be fuzzy-matched against Patina's `metal` vocabulary, not a structured field. (2) Numista's `orientation` enum ("coin", "medal", "variable") maps to die-axis degree notation used in Patina's vocab. (3) Individual coin year is on **issues** (variants), not the type — the panel should present the type's year range for display and let the collector enter a specific year manually. (4) `fineness` has no Numista equivalent; it remains blank.

- [x] **Staged suggestion UX:** The panel has two states: **Search** (default) and **Stage** (after a match is selected). In Search state: a text input for catalog number or title, a source toggle (Numista / ANS Local), a "Look up" button, and a results list. In Stage state: a per-field suggestion list where each row shows the Patina field name, the collector's current value (may be empty), and the reference value from the lookup. Fields where the reference value differs from the current value are shown with both values side by side. Checkboxes are **pre-checked for empty Patina fields** and **pre-unchecked for fields the collector has already entered** — protecting existing work by default. An "Apply selected" button at the bottom writes the checked fields into the form (not the DB — only into `formData`, leaving the collector in control of the final save). This exact pattern (proposed value staged into form state, not auto-committed) mirrors Zotero's DOI import and MusicBrainz Picard's tag review panel. **`/curating-ui` should be engaged before the panel is built** — this is the design-critical interaction in the feature.

- [x] **Cache TTL and invalidation:** 30 days default. Cached Numista responses are stored in a new `reference_cache` SQLite table: `(id TEXT PRIMARY KEY, source TEXT, data TEXT, cached_at INTEGER)` where `id` is `"numista:{N-number}"` or `"ans:{catalog-ref}"`. A **force-refresh icon** (↻) appears in the panel header whenever the active result is served from cache — clicking it discards the cached entry and re-fetches. The 30-day default is appropriate because Numista type records change infrequently (catalog data is stable). The `cached_at` epoch comparison happens at lookup time; stale entries are silently replaced on the next fetch. No background cache-warming — all cache misses are user-initiated.

- [x] **Scope of bundled ANS data:** **OCRE + CRRO in v1.** OCRE (~50k Roman Imperial types, 27 BCE–491 CE) and CRRO (~2,500 Roman Republican types, Crawford numbers) together cover the highest-pain ancient coin segment and are both CC0, from the same ANS GitHub repository, using the same Nomisma.org RDF vocabulary. **RPC Online** (Roman Provincial, Oxford) uses the same architecture and should be **Phase 2** — its scope is significantly larger and its data is more fragmented across volumes. **Greek coins** (SNG material) have no comparable open CC0 dataset; Greek coin collectors in v1 fall back to Numista search. This boundary is acceptable: the majority of ancient coin collectors focus on Roman coinage, and Numista covers Greek world coins via its general catalog. Patina should document this scope clearly in the panel's source selector.

- [x] **Panel placement in Scriptorium:** A **right-hand collapsible push drawer**, 300–340 px wide when open. The existing `ledger-layout` grid (currently 45/55 — PlateEditor | LedgerForm) gains a third collapsible column when the panel is open; the LedgerForm column is compressed proportionally. At window width < 1100 px, the panel defaults to closed and the layout reverts to the existing two-column grid. The toggle affordance is a narrow tab handle on the right edge of the LedgerForm column (16 px wide, full height, labelled "Referencia" rotated 90°). Keyboard shortcut: `Cmd+Shift+L` (macOS) / `Ctrl+Shift+L` (Windows/Linux) — registered only when focus is not in a text input, preventing conflicts with form typing. DOM order: reference panel node comes after `LedgerForm` in source (correct reading order for screen readers). See Section 8 for layout arithmetic. **This placement matches the "marginalia" metaphor** of the Manuscript Hybrid design language — the primary text (form) is the main column; the reference data occupies a narrower commentary column to the right.

---

## 7. Directional Recommendation

**Verdict: Ready for blueprint**

The research confirms strong collector demand, a clear and unoccupied market position, two technically viable data paths (ANS CC0 bundled for ancient coins; Numista API with local caching for world/modern coins), and proven UX precedents from analogous reference-manager tools (Zotero, MusicBrainz Picard). All seven open questions from the initial draft have been resolved. The privacy constraints are tractable: outbound requests carry only a catalog number string, are user-triggered, and use the collector's own API key. No Patina data ever leaves the machine.

The blueprint architect must respect four key constraints:
1. **Additive only** — data entry is fully functional with the panel absent or offline; the feature never blocks entry.
2. **Staged, never auto-committed** — reference results land in `formData`, not the DB; the collector always saves explicitly.
3. **ANS bundle is the zero-friction entry point** — no API key required, CC0, offline; this must work before any network feature is tested.
4. **`/curating-ui` must be engaged before the staged-suggestion panel is built** — the per-field review interaction is design-critical and should go through the three-path proposal process.

Activate `/curating-blueprints` next, referencing this report in Phase 0.

---

## 8. Implementation Notes — Field Mapping & Layout

### 8a. Numista API → Patina Field Mapping

Full endpoint: `GET https://api.numista.com/api/v3/coins/{id}?api_key=…`
Search endpoint: `GET https://api.numista.com/api/v3/search_coins?q={term}&api_key=…`

Rate limit: ~100 requests/day per key (free, non-commercial). Attribution required in UI: "Data from Numista (CC BY-NC-SA)."

| Patina field | Numista path | Notes |
|---|---|---|
| `title` | `title` | Direct |
| `issuer` | `issuer.name` | `issuer` is an object; extract `.name` string |
| `denomination` | `value.text` | e.g. `"1 Euro"` — run through vocab normalisation |
| `year_display` | `min_year` + `max_year` | Render as `"1958–1970"` or `"1958"` if equal; individual issue year requires second call to `/coins/{id}/issues` |
| `year_numeric` | `/coins/{id}/issues[0].year` | Optional second call; skip in v1 — present the range and let collector enter the specific year manually |
| `metal` | `composition.text` | Free-text string ("Copper-nickel"); fuzzy-match against Patina `metal` vocabulary; present as suggestion, not auto-applied |
| `fineness` | — | Not available in Numista public API; leave blank |
| `weight` | `weight` | Plain number (grams); direct map |
| `diameter` | `diameter` | Plain number (mm); direct map |
| `die_axis` | `orientation` | `"coin"` → `"180°"` (coin alignment); `"medal"` → `"0°"` (medal alignment); `"variable"` → `"Variable"` |
| `obverse_legend` | `obverse.lettering` | May be absent; skip if missing |
| `obverse_desc` | `obverse.description` | Direct |
| `reverse_legend` | `reverse.lettering` | May be absent; skip if missing |
| `reverse_desc` | `reverse.description` | Direct |
| `edge_desc` | `edge.description` | Fallback: `edge.type` ("reeded") if description absent |
| `catalog_ref` | `references` array | Format: `"{catalogue.name} {number}"` for the first entry (typically KM#); surface all references in the panel for the collector to choose |
| `mint` | `mints[0].name` | Array — if multiple mints, show picker in the panel; first mint as default suggestion |
| `era` | Derived from `min_year` | Apply heuristic: ≤ −500 → "Ancient Greek"; −500–476 CE → "Roman"; 477–1453 → "Medieval"; 1454–1799 → "Early Modern"; ≥ 1800 → "Modern" |

**Fields with no Numista equivalent** (collector must fill manually): `fineness`, `grade`, `rarity`, `provenance`, `story`, `purchase_price`, `purchase_date`, `purchase_source`.

**Die-axis terminology note:** Numista's `"coin"` orientation means the reverse die is rotated 180° relative to the obverse — what standard numismatic English calls **coin alignment** or **coin axis**. Numista's `"medal"` means the dies are aligned 0° — **medal alignment**. This matches standard usage; no inversion needed.

---

### 8b. ANS Local Dataset — Scope and Build Pipeline

**v1 bundle: OCRE + CRRO**

| Dataset | Records | Source | License |
|---|---|---|---|
| OCRE (Roman Imperial) | ~50,000 types | `github.com/AmericanNumismaticSociety/ocre-data` | CC0 |
| CRRO (Roman Republican / Crawford) | ~2,500 types | ANS GitHub | CC0 |

**v2 scope (deferred):** RPC Online (Roman Provincial, Oxford/ANS) — larger, more fragmented. Greek coins: no comparable open CC0 dataset exists; Numista covers this segment for world-catalog purposes.

**Build pipeline** (to be specced in blueprint):
1. `scripts/build-ans-bundle.cjs` — runs at build time, not at app install.
2. Downloads CC0 RDF/TTL dumps from ANS GitHub tagged releases.
3. Parses Nomisma.org triples; extracts: type ID, catalog ref (RIC/Crawford), authority name, mint, `nmo:hasStartDate`, `nmo:hasEndDate`, metal (`nmo:hasMaterial`), weight, diameter, obverse/reverse description and legend.
4. Writes to `data/ans-catalog.db` (SQLite, FTS5 on description fields for text search).
5. Compressed size target: ≤ 35 MB.
6. Versioned — app checks `ans_catalog_version` in preferences on startup; regenerates if stale.

**Lookup by catalog ref:** OCRE URIs encode the catalog reference directly (e.g. `ric.1(2).aug.1A`). The local lookup parses a user-typed `RIC I Augustus 1A` string into URI components and queries the FTS table. CRRO uses Crawford notation (`rrc.494/32`).

---

### 8c. Scriptorium Layout Arithmetic

Current `ledger-layout` at ≥ 1000 px: `grid-template-columns: 45% 55%` (PlateEditor | LedgerForm).

With reference panel open (≥ 1100 px window):
```
grid-template-columns: 40% 1fr 320px
```
- PlateEditor: 40% (slight compression)
- LedgerForm: fluid remainder (min-width: 480px enforced on the column)
- Reference panel: 320 px fixed

At < 1100 px: panel is hidden (`display: none` on the column); layout reverts to existing two-column grid. The toggle button remains visible in the LedgerForm header as a collapsed tab handle.

`BrowserWindow` minimum width should be set to `900` px (already recommended for general usability at the 45/55 split).

---

*Activate `/curating-blueprints` and reference this report in Phase 0. Engage `/curating-ui` before designing the staged-suggestion interaction (Section 6, question 4).*
