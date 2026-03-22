# Coin Fields Glossary

A professional reference for every field in the Patina coin record. Fields marked **required** must have a value; all others are optional. For fields with a standardized vocabulary, all recognized values are listed with descriptions.

---

## Identity & Classification

### `title` — required
**Type:** Text

The collector's personal name or short description for this coin. This is the primary label displayed throughout the Cabinet. It should be descriptive enough to identify the coin at a glance (e.g., *"Hadrian Denarius — Felicitas"* or *"1921 Morgan Dollar"*).

---

### `issuer`
**Type:** Text

The authority responsible for issuing the coin — typically a ruler, emperor, republic, or state. For ancient coins, this is the emperor's full name and dynasty (e.g., *"Marcus Aurelius Antoninus"*). For modern coins, it is the issuing nation or institution (e.g., *"United States of America"*). Corresponds to the Nomisma `authority` concept.

---

### `denomination`
**Type:** Text

The official monetary unit or face value of the coin as defined by its issuing authority. Denominations vary greatly by culture and period:

| Denomination | Culture / Period | Notes |
|---|---|---|
| Aureus | Roman Imperial | Gold; avg. 7–9g |
| Denarius | Roman Imperial | Silver; avg. 3–4g |
| Antoninianus | Roman Imperial | Silvered bronze; double denarius |
| Sestertius | Roman Imperial | Large brass; avg. 25g |
| Dupondius | Roman Imperial | Brass; avg. 12g |
| As | Roman Imperial | Copper; avg. 9g |
| Quadrans | Roman Imperial | Quarter-as; approx. 3g |
| Drachm | Greek | Silver; avg. 3–5g |
| Tetradrachm | Greek | Four drachms |
| Solidus | Byzantine | Gold; avg. 4–5g |
| Follis | Byzantine | Bronze |
| Dirham | Islamic | Silver |
| Dinar | Islamic | Gold |
| Penny / Denarius | Medieval European | Silver |
| Florin | Medieval European | Gold |
| Ducat | Medieval/Renaissance | Gold |
| Dollar | Modern | Various metals |
| Crown | Modern British | Silver or cupro-nickel |

---

### `era` — required
**Type:** Text

The calendrical or historical era system used for dating this coin. Determines how `year_display` and `year_numeric` should be interpreted.

| Value | Full Name | Notes |
|---|---|---|
| `AD` | Anno Domini | Years after 1 BC; `year_numeric` is a positive integer (e.g., `134` for 134 AD) |
| `BC` | Before Christ | Years before 1 AD; `year_numeric` is a negative integer (e.g., `-44` for 44 BC) |
| `AH` | Anno Hegirae (Hijri) | Islamic lunar calendar; year 1 AH = 622 AD. Approximate AD conversion: `AD ≈ 0.97 × AH + 622` |
| `Byzantine` | Byzantine reckoning | Uses indiction cycles and imperial regnal years |
| `Regnal` | Regnal Years | Dated by the year of a ruler's reign (e.g., TR P III for year 3 of tribunician power) |
| `Undated` | No date on coin | Use `year_display` for a scholarly circa estimate (e.g., "c. 330–340 AD") |

---

## Dating

### `year_display`
**Type:** Text

A human-readable date or date range as it appears in a catalog or should be presented to the viewer. This is the **display** value — it accommodates uncertainty, ranges, and calendar notation:

- `"134 AD"` — single year, anno domini
- `"44 BC"` — single year, before christ
- `"c. 119–122 AD"` — circa range
- `"AH 76 (c. 694 AD)"` — Hijri with AD conversion
- `"TR P III (119 AD)"` — regnal year with conversion
- `"Undated, c. 330–340 AD"` — scholarly estimate

---

### `year_numeric`
**Type:** Integer

A single integer for sorting and filtering purposes. Always convert to the Christian/Common Era scale:

- **AD / CE:** positive integer — e.g., `134` for 134 AD
- **BC / BCE:** negative integer — e.g., `-44` for 44 BC
- **Undated:** use the midpoint or earliest year of the scholarly estimate
- **AH:** convert to approximate AD year before storing

---

## Physical Description

### `mint`
**Type:** Text

The city, workshop, or facility where the coin was struck. For Roman coins this is often a city abbreviation in the exergue (e.g., *"Rome"*, *"Lugdunum"*, *"Antioch"*). For modern coins it may be a mint mark letter (e.g., *"Philadelphia"*, *"San Francisco"*). Corresponds to Nomisma mint vocabulary.

---

### `metal`
**Type:** Text

The primary metal or alloy of the coin. Use the standard numismatic abbreviation or full name:

| Code | Full Name | Description |
|---|---|---|
| `AV` | Gold (Aurum) | Pure or high-fineness gold |
| `AR` | Silver (Argentum) | Pure or alloyed silver |
| `AE` | Bronze / Copper (Aes) | Copper, bronze, or brass alloys — the most common ancient base metal |
| `BI` | Billon | Low-silver copper alloy, typically < 50% silver; used in late Roman antoniniani |
| `EL` | Electrum | Natural gold-silver alloy; used in early Lydian and some Greek coinage |
| `OR` | Orichalcum | Ancient brass-like gold-colored copper-zinc alloy; used for Roman sestertii and dupondii |
| `POT` | Potin | Bronze-tin alloy with high tin content; used in Gallic and some early Celtic coins |
| `PB` | Lead (Plumbum) | Used for tesserae, tokens, and some provincial issues |
| `Ni` | Nickel | Modern coinage alloy |
| `Cu-Ni` | Cupro-Nickel | 75% copper, 25% nickel; common modern coinage metal |
| `Brass` | Brass | Copper-zinc alloy; modern coinage |
| `Steel` | Steel | Iron-based; some WWII-era and modern issues |
| `Platinum` | Platinum | Rare precious metal; bullion and commemorative coins |

---

### `fineness`
**Type:** Text

The proportion of precious metal in the alloy, expressed as a decimal fraction (millesimal fineness). Applicable to gold and silver coins where purity is a diagnostic or value factor.

| Expression | Meaning | Example coins |
|---|---|---|
| `.999` | 99.9% pure | Modern bullion (Gold Eagle, Maple Leaf) |
| `.9999` | 99.99% pure (four nines) | Royal Canadian Mint bullion |
| `.958` | 95.8% — Britannia silver | British Britannia |
| `.950` | 95% | High-quality Roman aurei |
| `.925` | 92.5% — Sterling silver | British coins pre-1920, some world coins |
| `.900` | 90% | US silver coins pre-1965; most European silver |
| `.835` | 83.5% | European silver (many post-WWI) |
| `.800` | 80% | Swiss and Scandinavian silver; some Roman denarii |
| `.500` | 50% | Post-1920 British silver; some late Roman issues |
| `.417` | 41.7% | Some medieval billon |
| `< .400` | Billon range | Late Roman antoniniani (silvered bronze) |

For ancient coins, fineness varies significantly by period and emperor — the silver content of the Roman denarius declined from ~95% under Augustus to under 5% by the 280s AD.

---

### `weight`
**Type:** Decimal (grams)

The coin's weight in **grams to two decimal places** (e.g., `3.28`). Weight is a primary diagnostic tool for authenticity and attribution. Weigh with a digital scale; for high-value coins, a precision balance is recommended.

- Ancient coins exhibit natural variance from flan cutting and wear; compare against published standards for the type.
- 1 troy ounce = 31.1035 g (reference for bullion coins).

---

### `diameter`
**Type:** Decimal (millimeters)

The coin's diameter in **millimeters to one decimal place** (e.g., `18.5`). Measure at the widest point using digital calipers. If the flan is significantly oval (common in ancient hand-struck coins), measure both axes and record the larger value, noting the variation in `obverse_desc` or `story`.

---

### `die_axis`
**Type:** Text (clock-hour notation)

The rotational relationship between the obverse die and the reverse die, expressed as an **O'clock position (1h–12h)**. To measure: hold the coin obverse-up with the portrait upright; flip the coin left-to-right on its vertical axis; the hour position where the top of the reverse design points is the die axis.

Each clock hour = 30 degrees of rotation (clockwise from 12h).

| Value | Degrees | Common Name | Notes |
|---|---|---|---|
| `12h` | 0° / 360° | Medal alignment | Reverse right-side-up; standard for France, Germany, ancient Greek, many European nations |
| `1h` | 30° | — | Slight clockwise rotation |
| `2h` | 60° | — | |
| `3h` | 90° | Quarter-turn | |
| `4h` | 120° | — | |
| `5h` | 150° | — | |
| `6h` | 180° | Coin alignment | Reverse upside-down; standard for UK (historic), USA, many Roman Imperial issues |
| `7h` | 210° | — | |
| `8h` | 240° | — | |
| `9h` | 270° | Quarter-turn CCW | Standard for many Athenian tetradrachms |
| `10h` | 300° | — | |
| `11h` | 330° | — | |

**Note for ancient coins:** Die axis variation is normal for hand-struck coinage and is not an error. Record the actual measured position. On modern machine-struck coins, a die axis other than 12h or 6h constitutes a *die rotation error*, which may affect rarity.

---

## Inscriptions & Descriptions

### `obverse_legend`
**Type:** Text

The inscription on the **obverse (front/heads side)** of the coin, transcribed exactly as it appears. Use **uppercase** for Latin, Greek, and Arabic legends. Expand abbreviations in square brackets only when certain (e.g., `IMP[ERATOR] CAES[AR] HADRIANVS AVG[VSTVS]`). Use a period `.` to separate words when no dividers appear on the coin.

Common Roman obverse legend elements:

| Abbreviation | Latin | Meaning |
|---|---|---|
| `IMP` | Imperator | Emperor / Supreme Commander |
| `CAES` | Caesar | Title of heir or emperor |
| `AVG` | Augustus | Majestic / Venerable |
| `TR P` | Tribunicia Potestas | Tribunician Power (indicates regnal year) |
| `COS` | Consul | Consul (+ numeral = nth consulship) |
| `P M` | Pontifex Maximus | High Priest |
| `P P` | Pater Patriae | Father of the Country |
| `D N` | Dominus Noster | Our Lord |
| `S P Q R` | Senatus Populusque Romanus | The Senate and People of Rome |

---

### `obverse_desc`
**Type:** Text

A concise English description of the obverse design, motif, and portrait. Follow the formula: **[subject] [orientation], [description]**.

- *"Bust of Hadrian, laureate, right"*
- *"Bust of Faustina II, draped, right"*
- *"Eagle standing facing, wings spread"*
- *"Liberty, draped, facing left, wearing Phrygian cap"*

Standard orientation terms: **right** (facing right), **left** (facing left), **facing** (facing viewer). Standard portrait qualifiers: **laureate** (laurel wreath), **radiate** (radiate crown), **diademed** (simple headband), **helmeted**, **draped**, **cuirassed** (in armor).

---

### `reverse_legend`
**Type:** Text

The inscription on the **reverse (back/tails side)** of the coin. Follow the same transcription rules as `obverse_legend`. The reverse legend often names the personification, deity, or concept depicted, or carries the date and mint mark.

| Abbreviation | Latin | Meaning |
|---|---|---|
| `S C` | Senatus Consulto | By Decree of the Senate (on Roman bronze) |
| `FELICITAS` | Felicitas | Good Fortune |
| `PROVIDENTIA` | Providentia | Providence |
| `VICTORIA` | Victoria | Victory |
| `CONCORDIA` | Concordia | Harmony |
| `PIETAS` | Pietas | Piety / Duty |
| `VIRTVS` | Virtus | Courage / Valor |
| `FIDES` | Fides | Faith / Trust |
| `AEQVITAS` | Aequitas | Equity / Fairness |
| `INVICTVS` | Invictus | Unconquered |

---

### `reverse_desc`
**Type:** Text

A concise English description of the reverse design and motif. Follow the same formula as `obverse_desc`:

- *"Felicitas standing left, holding caduceus and cornucopia"*
- *"Roma seated left on cuirass, holding Victory and spear; shield at side"*
- *"Eagle standing on thunderbolt, wings spread; S C in field"*
- *"Liberty Bell; Independence Hall in background"*

Include the exergue content (mint mark, officina letter) if notable: *"…; in exergue: SMANT"* (Sacred Mint of Antioch).

---

### `edge_desc`
**Type:** Text

A description of the coin's edge (the third side). For ancient coins this is usually *"plain"*. For modern coins it is often a distinctive feature.

| Value | Description |
|---|---|
| `Plain` | Smooth, no decoration or treatment |
| `Reeded` | Parallel vertical grooves (milled edge); the most common on modern silver and clad coins |
| `Lettered` | Words, phrases, or inscriptions running around the edge |
| `Interrupted reeded` | Alternating sections of reeding and plain |
| `Scalloped` | Wavy or notched edge; decorative |
| `Grained` | Fine diagonal reeding or milling |
| `Security edge` | Interrupted reeding used as an anti-counterfeiting measure (e.g., some Euro coins) |
| `Cable` | Twisted rope-like pattern |
| `Ornamented` | Decorative pattern other than reeding (stars, dots, etc.) |

---

## Cataloging & Reference

### `catalog_ref`
**Type:** Text

The standard bibliographic citation(s) for this coin's type. Format: `[Abbreviation] [Volume/Part] [Number]`. List the primary reference first; separate multiple references with a semicolon.

**Examples:** `RIC II 218`, `Crawford 432/1`, `DOC 4`, `RIC VI 121; BMC 45`

| Abbreviation | Full Reference | Coverage |
|---|---|---|
| `RIC` | Roman Imperial Coinage | Roman Imperial, 31 BC – 491 AD (10 volumes) |
| `RRC` / `Crawford` | Roman Republican Coinage (Crawford) | Roman Republic, c. 280–31 BC |
| `RPC` | Roman Provincial Coinage | Non-imperial Roman civic/provincial issues |
| `BMC` | British Museum Catalogue | Greek, Roman, Byzantine |
| `SNG` | Sylloge Nummorum Graecorum | Greek coinage |
| `DOC` | Dumbarton Oaks Catalogue | Byzantine |
| `Sear` / `SBCV` | Sear Byzantine Coins & Their Values | Byzantine |
| `North` | English Hammered Coinage (North) | Medieval British |
| `Cohen` | Description des monnaies… (Cohen) | Roman Imperial (older secondary reference) |

Online resources: OCRE (`numismatics.org/ocre`) for Roman Imperial; CRRO (`numismatics.org/crro`) for Republican.

---

### `rarity`
**Type:** Text

An assessment of how scarce this specific type is in the numismatic market. Rarity ratings in the major catalogs reflect specimens known **at time of publication** — treat them as a rough guide, not an absolute statement.

#### RIC Scale (Roman Imperial Coinage)
The primary reference scale for Roman coins; notation varies by volume:

| Value | Approximate Known Specimens | Description |
|---|---|---|
| `C3` | > 41 known | Very Common |
| `C2` | 31–40 known | Common |
| `C1` | 22–30 known | Common (lower end) |
| `C` | > 22 known | Common (general) |
| `S` | 16–21 known | Scarce |
| `R1` | 11–15 known | Rare |
| `R2` | 7–10 known | Rare |
| `R3` | 4–6 known | Rare |
| `R4` | 2–3 known | Very Rare |
| `R5` | 1 known | Unique (at time of publication) |

#### Cohen Scale (older Roman reference catalogs)

| Value | Description |
|---|---|
| `C` | Common |
| `R` | Rare — available but not frequently encountered |
| `RR` | Very Rare — appears on market only occasionally |
| `RRR` | Extremely Rare — perhaps once per decade |
| `RRRR` | Unique or nearly unique |

#### General / Modern Scale (Sear, dealer catalogs)

| Value | Description |
|---|---|
| `Common` | Readily available |
| `Scarce` | Available but requires some searching |
| `Rare` | Difficult to find; commands a premium |
| `Very Rare` | Appears on the market infrequently |
| `Extremely Rare` | Very few known; major acquisition |
| `Unique` | Only one specimen known |

---

### `grade`
**Type:** Text

The condition of the coin on a recognized grading scale. The appropriate scale depends on the coin's type and age.

#### Adjectival Scale (Ancient Coins)
Used for Greek, Roman, Byzantine, and medieval coins by NGC Ancients, Heritage, CNG, and the specialist trade:

| Grade | Abbreviation | Description |
|---|---|---|
| Poor | P | Barely identifiable; type or date unreadable |
| Fair | FR | Outlines of major devices faintly visible; mostly worn smooth |
| About Good | AG | Major device outlines visible; nearly all interior detail obliterated |
| Good | G | Design outline clear; little interior detail; type identifiable |
| Very Good | VG | Some interior detail visible in protected areas; legends partially legible |
| Fine | F | Moderate even wear; all major features present; high-relief areas flattened |
| Very Fine | VF | Light to moderate wear; most detail present; all features sharp |
| Extremely Fine | EF / XF | Light wear only on very highest points; nearly full detail |
| About Uncirculated | AU / aEF | Trace wear on absolute highest points only; virtually full detail |
| Uncirculated | Unc | No wear; full original surface as struck |
| Fleur de Coin | FDC | Perfect; unworn, fully struck, flawless surfaces — the highest ancient designation |

#### Sheldon 70-Point Scale (Modern / World Coins)
Developed by Dr. William Sheldon (1949); standardized by PCGS (1986) and NGC (1987):

**Circulated grades:**

| Grade | Code | Description |
|---|---|---|
| 1 | P-1 | Barely identifiable; worn nearly smooth |
| 2 | FR-2 | Major outlines visible; lettering largely gone |
| 3 | AG-3 | Heavily worn; date visible but weak |
| 4 | G-4 | Design outline visible; rims flat; lettering worn |
| 6 | G-6 | Slightly more detail; peripheral lettering complete |
| 8 | VG-8 | Some interior detail; major features distinct |
| 10 | VG-10 | Most lettering sharp; fields worn |
| 12 | F-12 | All major features sharp; high-relief areas show flatness |
| 15 | F-15 | As F-12 with slightly more detail |
| 20 | VF-20 | All major features sharp; light to moderate even wear |
| 25 | VF-25 | Slightly more detail than VF-20 |
| 30 | VF-30 | Light even wear; all lettering and major features sharp |
| 35 | VF-35 | Traces of mint luster possibly visible in protected areas |
| 40 | EF-40 / XF-40 | Light wear on high points only; all elements sharp |
| 45 | EF-45 / XF-45 | Slight wear on very highest points; half or more of luster present |
| 50 | AU-50 | Traces of wear on high points; at least half of luster visible |
| 53 | AU-53 | Barest trace of wear; three-quarters of luster remains |
| 55 | AU-55 | Only small trace of wear; three-quarters or more of luster |
| 58 | AU-58 | Slightest friction on highest points; nearly full luster |

**Mint State / Uncirculated (no wear — distinctions based on contact marks and luster):**

| Grade | Code | Description |
|---|---|---|
| 60 | MS-60 | Heavy contact marks; luster may be impaired |
| 61 | MS-61 | Numerous obvious marks; dull or washed-out luster |
| 62 | MS-62 | Noticeable contact marks; luster slightly impaired |
| 63 | MS-63 | Choice Uncirculated — moderate marks; luster above average |
| 64 | MS-64 | Several contact marks; none severely detracting; above-average luster |
| 65 | MS-65 | Gem Uncirculated — strong luster; only a few minor marks |
| 66 | MS-66 | Above-average strike; marks few and minor, not in focal areas |
| 67 | MS-67 | Superb Gem — only minimal imperfections barely visible without magnification |
| 68 | MS-68 | Near-perfect surfaces; imperfections detectable only under magnification |
| 69 | MS-69 | Virtually perfect; any imperfections imperceptible |
| 70 | MS-70 | Perfect Uncirculated — no post-production imperfections at 5× magnification |

**Proof coins** use the same numeric scale with the prefix **PR** (PCGS) or **PF** (NGC). A "+" suffix (e.g., MS-64+) indicates exceptional eye appeal for the grade. **CAM** / **DCAM** designations indicate cameo contrast on proof coins.

---

## Provenance & Acquisition

### `provenance`
**Type:** Text

The documented ownership history of the coin before it entered the current collection. Provenance is important for authentication, legal compliance, and scholarly credibility. Record named collections, auction house sales, and documented find spots where known.

**Examples:**
- *"Ex Naville Numismatics, Auction 58, Lot 312 (2020)"*
- *"Ex Spink, London, 1987; formerly collection of Sir Edward Thomas"*
- *"Found in Wiltshire, UK (PAS record WILT-AB123)"*

Note: many countries require documentation of provenance for coins acquired after 1970 (UNESCO Convention threshold).

---

### `story`
**Type:** Text (long form)

A free-text field for historical context, personal notes, scholarly commentary, or the collector's own narrative about this coin. This is the "curator's note" — use it to record what makes this coin significant, interesting legends about the depicted figure, or notes on authenticity and condition nuances not captured by other fields.

---

### `purchase_price`
**Type:** Decimal

The price paid to acquire this coin, in the currency of the transaction. Used for insurance valuation and collection accounting. For coins received as gifts or inherited, record the estimated fair market value at time of acquisition.

---

### `purchase_date`
**Type:** Date (ISO 8601 — `YYYY-MM-DD`)

The date the coin was acquired. Use `YYYY-MM-DD` format for consistency (e.g., `2024-03-15`).

---

### `purchase_source`
**Type:** Text

Where or from whom the coin was acquired. Include auction house name, dealer, show, or private seller as appropriate.

**Examples:**
- *"Heritage Auctions, NYINC 2024"*
- *"Classical Numismatic Group (CNG), Mail Bid Sale 112"*
- *"Roma Numismatics, E-Sale 94"*
- *"Spink, London"*
- *"Private purchase from fellow collector"*

---

## Further Reading

- **RIC Online (OCRE):** `numismatics.org/ocre` — Roman Imperial types with RIC references
- **Republican Coinage (CRRO):** `numismatics.org/crro` — Crawford references
- **NGC Coin Grading Scale:** `ngccoin.com/coin-grading/grading-scale/`
- **NGC Ancients Grading:** `ngccoin.com/specialty-services/ancient-coins/grading.aspx`
- **PCGS Grading Standards:** `pcgs.com/grades`
- **Portable Antiquities Scheme:** `finds.org.uk/database` — UK find database
- **Forum Ancient Coins / NumisWiki:** Community reference for ancient coin terminology

---

*Last updated: 2026-03-21 — Patina Senior Cataloger*
