# Numismatic Cataloging Standards

## 1. Classical References
- **RIC (Roman Imperial Coinage):** The definitive 10-volume standard for Roman coins from Augustus (27 BC) to Zeno (491 AD). Now available online via **OCRE** (Online Coins of the Roman Empire).
- **RPC (Roman Provincial Coinage):** The standard for non-imperial Roman coins (local/civic issues). Available via **OCRE**.
- **Crawford (RRC):** *Roman Republican Coinage* by Michael Crawford. The standard for the Republican era before 27 BC. Available via **CRRO**.
- **BMC (British Museum Catalogues):** Multi-volume series (BMC Greek, BMC Roman, BMC Byzantine). Still widely used for rare types.
- **SNG (Sylloge Nummorum Graecorum):** Series of catalogues of Greek coins in various public and private collections.

## 2. Byzantine & Medieval
- **DOC (Dumbarton Oaks Catalogue):** The standard for Byzantine coinage.
- **Sear (SBCW):** *Byzantine Coins and Their Values* by David Sear. More accessible than DOC.
- **North:** *English Hammered Coinage* by John North. The standard for British medieval coins.

## 3. Modern Online Resources
- **OCRE (Online Coins of the Roman Empire):** `https://numismatics.org/ocre` - Free online database of Roman imperial coin types with RIC references.
- **CRRO (Coinage of the Roman Republic Online):** `https://numismatics.org/crro` - Free online database of Republican coin types with Crawford references.
- **PCNA (Patina Coin Atlas):** `https://patina.coin` - Collection management with auto-reference lookup (future integration).
- **PAS (Portable Antiquities Scheme):** `https://finds.org.uk/database` - UK find database with coin identifications.
- **ACS (American Coin Atlas):** Greek coin type database and geographical mapping.
- **CoinArchivesPro:** Auction record database for pricing research.
- **NGC Coin Explorer:** `https://www.ngccoin.com/coin-explorer/` - Modern world coin database with grading standards.

## 4. Formatting Rules
- **Reference Code:** `[Abbreviation] [Vol/Part] [Num]` (e.g., `RIC II 218`, `Crawford 432/1`).
- **Multiple References:** If a coin is in multiple major catalogs, list the primary one first, then others (e.g., `RIC VI 121; DOC 4`).
- **Variety Codes:** Use lowercase suffixes if the catalog specifies them (e.g., `RIC VIII 103a`).
- **Online References:** For OCRE/CRRO, include the full URI: `https://numismatics.org/ocre/id/ric.1(2).aug.1A`

## 5. Catalog Abbreviations Quick Reference
| Code | Full Name | Era |
|------|-----------|-----|
| RIC | Roman Imperial Coinage | Roman Imperial (27 BC - 491 AD) |
| RRC / Crawford | Roman Republican Coinage | Roman Republic (-270 to -27) |
| RPC | Roman Provincial Coinage | Roman Provincial |
| BMC | British Museum Catalogue | Greek, Roman, Byzantine |
| SNG | Sylloge Nummorum Graecorum | Greek |
| DOC | Dumbarton Oaks Catalogue | Byzantine |
| SBCW / Sear | Sear Byzantine Coins & Values | Byzantine |
| North | English Hammered Coinage | Medieval British |
| HN | Hesselink & North (cf. 201) | Medieval |

---

## 6. Integration with Patina

For the **vocabulary system**:
- Denominations and metals: Use Nomisma IDs
- Mints: Use Nomisma mints with GeoJSON for mapping
- Eras/Periods: Use Nomisma period concepts
- Catalog references: Store as plain text with format validation

For **future reference lookup**:
- Link to OCRE/CRRO for automatic RIC/RPC reference resolution
- Display coin type images from partner institutions