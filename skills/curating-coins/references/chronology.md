# Numismatic Chronology

## 1. Western Dating Systems
- **BC / AD (Before Christ / Anno Domini):** Traditional standard for Western collections.
  - BC: Years before 1 AD (e.g., 44 BC)
  - AD: Years after 1 BC (e.g., 134 AD)
- **BCE / CE (Before Common Era / Common Era):** Modern academic standard (non-religious).
  - 1 BCE = 1 BC, 1 CE = 1 AD
- **Dating Rule:** For catalog records:
  - **AD/CE** dates: Positive integers (e.g., `134` for 134 AD)
  - **BC/BCE** dates: Negative integers (e.g., `-44` for 44 BC)
  - Store both `year_numeric` (integer) and `year_display` (formatted string)

## 2. The Hijri (Islamic) Calendar (AH)
- **Concept:** Lunar calendar dating from the Migration (*Hegira*) of Muhammad in 622 AD.
- **Era:** AH (Anno Hegirae) or هجرية
- **Conversion to AD:**
  - Early period: `AD ≈ 0.97 × AH + 622`
  - Later period: `AD ≈ 0.97 × AH + 623` (accounts for calendar drift)
- **Note:** Islamic coins often have dates written in words (abjad numerals), not digits.
- **Examples:**
  - AH 76 = ~694 AD
  - AH 622 = ~1225 AD

## 3. Roman Dating Systems
### Regnal Years
- **Concept:** Dating from the year of a ruler's reign.
- **Tribunician Power (TR P):** Used for emperors to indicate their accession year.
  - TR P = Tribunicia Potestas (Tribunician Power)
  - "TR P III" = Third year of tribunician power
- **Consulships (COS):** Annual magistracy, listed on coins.
  - "COS II" = Second consulship
- **Imperator (IMP):** Acclamation as emperor, used in titulature.
- **Pater Patriae (PP):** Title assumed after reign end.

### Era of the Consulship
- Consuls were eponymous; listing them dates the coin.

### Ab Urbe Condita (AUC)
- "From the founding of Rome" = 753 BC
- Used in some ancient sources

## 4. Greek Dating Systems
### Olympiads
- Ancient Greek athletic cycle, 4-year periods.
- First Olympiad = 776 BC
- "Olympiad 187, Year 3" = 331/330 BC

### Archon Years
- Annual magistrates in Athens.
- "Archon Eukleidēs" = 403/402 BC

### City Eras
- Many Greek cities had their own eras (e.g., from city founding).

## 5. Byzantine Dating Systems
### Indiction Cycles
- 15-year fiscal cycles used for dating.
- Indiction 1 = September 1, 312 AD (byzantine reckoning)
- Not always on coins, but appears in some documents.

### Imperial Years
- From emperor's reign, like Roman system.

## 6. Medieval Dating Systems
### British Regnal Years
- Use monarch reign dates (e.g., "Edward III, Fourth Coinage, 1351-1361")
- Format: `[Monarch], Year [X] of Reign`

### Crusader States
- Often used regnal years of western monarchs.

## 7. Undated Coins
- **Concept:** Coins that do not display a year.
- **Standard:** Use a "circa" date or a range based on the ruler's reign or stylistic features.
- **Format:** 
  - `year_display`: "c. 330-340 AD" 
  - `year_numeric`: Use midpoint (`335`) or earliest year (`330`)
- **Attribution:** Base on ruler portrait, mint, style, and weights.

## 8. Date Placement on Coins
| Location | Typical Content |
|----------|-----------------|
| Exergue | Mint mark, year (Roman), control marks |
| Obverse Legend | Titles, regnal years |
| Reverse Field | Secondary dates, emission codes |
| Edge | Rare date placements |

## 9. Year Display Variations
- **Written:** Full word (e.g., "SEPTIMIVS")
- **Abbreviated:** Numeric or abbreviated (e.g., "SEB" for 200s)
- **Numeral:** Greek/Latin numerals (e.g., "XV" = 15)
- **Abjad:** Arabic letter-numbers ( Islamic)
- **Consuls:** Both consuls listed by name

## 10. Approximation Guidelines
| Term | Meaning |
|------|---------|
| c. | Circa (approximately) - ±5 years typical |
| ca. | Circa (Latin abbreviation) |
| p.c. | Post conquest |
| a.c. | Ante conquest |
| Pre-/Early | Before major type change |
| Late | Near end of period |
| Issues of | Specific period |