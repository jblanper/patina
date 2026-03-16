# Curatorial Report: Coin Detail Improvement

**Date:** 2026-03-15  
**Subject:** Visual Refinement of the Coin Detail View (`src/renderer/components/CoinDetail.tsx`)  
**Reference:** User Feedback ("Make it look like the Cabinet/Ledger") & `docs/style_guide.md`

## 1. Critique of Current Implementation

The current `CoinDetail` view is functional but lacks the "Curator-First" soul defined in our design mandates. It presents data as a *database dump* rather than a *curated artifact*.

### Key Deficiencies:
1.  **Visual Hierarchy:** The current header (`h1` + subtitle) feels disconnected from the content. It lacks the "Archival Header" treatment seen in the Cabinet view (`Archive v1.0 // ...`).
2.  **Data Presentation:** The "Physical Data" and "Attribution" sections use a generic grid. In a physical ledger, these would be structured, aligned entries, possibly with guide lines or distinct grouping.
3.  **"The Plate" Treatment:** The image container is a simple box. It needs to feel like a "mounted plate" or a protected specimen.
4.  **Whitespace & Sanctuary:** The content is too dense. The "Expansive Rule" (`clamp(3rem, 8vw, 4rem)`) needs to be applied more aggressively to create breathing room around the object.
5.  **Navigation:** The "Back" button is utilitarian. It should feel like "Closing the Ledger" or "Returning to the Cabinet".

## 2. Design Philosophy: "The Archival Ledger"

To align with the user's preference for the Cabinet page, we must treat the Detail View not as a "web page" but as a **single folio within a larger manuscript**.

*   **Typography:** Elevate `Cormorant Garamond` (Serif) for storytelling elements. Restrict `JetBrains Mono` strictly to technical metrics.
*   **Layout:** Use a split-folio design (Image Left, Data Right) but with a "Vellum Border" divider to simulate a book spine or distinct column.
*   **Texture:** Introduce subtle background shifts (using `--stone-pedestal`) to define the "Plate" area vs. the "Record" area.

## 3. Proposed Improvements (The 3 Paths)

I have prepared a diverse set of options in the accompanying mockup file: `docs/curating-ui/proposal_coin_detail_improvement.html`.

*   **Path A: "The Museum Label" (Minimalist)**
    *   **Concept:** Focus entirely on the object. The data is secondary, styled like a small museum placard below the artifact.
    *   **Best For:** Users who view the collection primarily as an art gallery.

*   **Path B: "The Ledger Folio" (Structured - RECOMMENDED)**
    *   **Concept:** A strict, two-column layout mimicking a physical registry. The "Plate" is on the left, the "Record" on the right. Data fields are aligned with hairline borders.
    *   **Alignment:** Closest to the "Cabinet" aesthetic the user liked.

*   **Path C: "The Research Dossier" (Comprehensive)**
    *   **Concept:** A more information-dense layout with distinct "cards" or "sections" for Physical Data, History, and Provenance.
    *   **Best For:** deeply detailed records with extensive notes.

## 4. Next Steps

1.  **Review:** Open `docs/curating-ui/proposal_coin_detail_improvement.html` in your browser.
2.  **Select:** Choose a path (Path B is the strongest candidate).
3.  **Execute:** I will refactor `CoinDetail.tsx` to match the selected design, ensuring all CSS is strictly "Vanilla" and located in `src/renderer/styles/index.css`.
