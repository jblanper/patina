# Implementation Blueprint: [Title]

**Date:** [YYYY-MM-DD]  
**Status:** [Draft/In-Review/Approved]  
**Reference:** [Relevant documentation or parent blueprint]

## 1. Objective
[Clear, concise description of the goal.]

### Philosophical Alignment
- [ ] **Archival Ledger Aesthetic:** Does this feel like a museum tool? (Per `docs/style_guide.md`)
- [ ] **Privacy First:** No external CDNs or telemetry introduced?
- [ ] **Single-Click Rule:** Is the UI hierarchy flat and intuitive?

## 2. Technical Strategy
[Detailed plan including schema changes, API handlers, and UI components.]

## 3. Verification Strategy (Quality Oversight)
- **Testing Plan:** [Specific test cases for hooks/components.]
- **Colocation Check:** [Confirm test files live next to source.]
- **Mocking Strategy:** [Details on mocking Electron API.]

---

## 4. Architectural Oversight (`curating-blueprints`)
**Status:** [Pending/Verified]
### Audit Findings:
- **System Integrity:** [Cross-process consistency, type safety.]
- **Abstraction:** [Does logic leak into the Electron bridge?]

### Review Notes & Suggestions:
- [Note 1]

---

## 5. Security Assessment (`securing-electron`)
**Status:** [Pending/Verified]
### Audit Findings:
- **The Filter:** [Zod validation, .strict() schemas.]
- **Protocols:** [patina-img:// path sanitization.]

### Review Notes & Suggestions:
- [Note 1]

---

## 6. Quality Assessment (`assuring-quality`)
**Status:** [Pending/Verified]
### Audit Findings:
- **Coverage Check:** [Targets: 100% validation, 90% hooks, 80% components.]
- **Async Safety:** [waitFor, findBy* usage.]

### Review Notes & Suggestions:
- [Note 1]

---

## 7. UI Assessment (`curating-ui`)
**Status:** [Pending/Verified]
### Audit Findings:
- **Aesthetic Compliance:** [Manuscript Hybrid v3.3 standards.]
- **Accessibility:** [Semantic HTML, contrast, keyboard nav.]

### Review Notes & Suggestions:
- [Note 1]

---

## 8. Numismatic & UX Assessment (`curating-coins`)
**Status:** [Pending/Verified]
### Audit Findings:
- **Historical Accuracy:** [Catalog references, terminology.]
- **Collector UX:** [Does the design meet archival/numismatic needs?]

### Review Notes & Suggestions:
- [Note 1]

---

## 9. User Consultation & Decisions
### Open Questions:
1. [Question 1]

### Final Decisions:
- [Decision 1]

---

## 10. Post-Implementation Retrospective
**Date:** [YYYY-MM-DD]  
**Outcome:** [Summary of success or failure]

### Summary of Work
- [Key achievement 1]

### Pain Points
- [Challenge 1]

### Things to Consider
- [Future improvement 1]
- **Core Doc Revision:** [Confirm if @AGENTS.md, style_guide.md, or style_guide.html were updated.]
