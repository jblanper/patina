# Numismatic Chronology

## 1. Classical Eras
- **BC / AD (Before Christ / Anno Domini):** The traditional standard for Western collections.
- **BCE / CE (Before Common Era / Common Era):** The modern academic standard.
- **Dating Rule:** For catalog records, **AD/CE** dates are recorded as positive integers, while **BC/BCE** dates are recorded as negative integers in the `year_numeric` field (e.g., 44 BC = `-44`).

## 2. The Hijri (Islamic) Calendar (AH)
- **Concept:** Dating from the Migration (*Hegira*) of Muhammad in 622 AD.
- **Conversion Tip:** To convert AH to AD, use the approximate formula `AD = 0.97 * AH + 622`.
- **Note:** Islamic coins often have the date written in words rather than digits.

## 3. Regnal Years
- **Concept:** Dating from the year of a ruler's reign.
- **Example:** `COS III` (Consul for the third time) on a Roman coin can narrow the date to a specific year or range.
- **British Hammered:** Use monarch reign dates (e.g., `Edward III, Fourth Coinage, Pre-Treaty Period (1351-1361)`).

## 4. Undated Coins
- **Concept:** Coins that do not display a year.
- **Standard:** Use a "circa" date or a range based on the ruler's reign or stylistic features (e.g., `c. 330-340 AD`).
- **Database:** Set `year_display` to "c. 330-340 AD" and `year_numeric` to the midpoint or earliest year.
