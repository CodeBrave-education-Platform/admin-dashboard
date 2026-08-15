# Test Readiness Certification (`TEST_READY.md`)

**Date**: 2026-08-15  
**Author**: Test Writer (Track A: E2E & Programmatic Testing)  
**Status**: **READY FOR IMPLEMENTATION VERIFICATION**  
**Harness File**: `D:\admin dashboard\test-parser.js`  
**Runner Command**: `node test-parser.js`

---

## 1. Test Suite Overview

The programmatic test harness for Acceptance Criteria **R1** (Robust PDF Extraction) has been constructed, validated, and published at `D:\admin dashboard\test-parser.js`.

The test harness embeds a multi-strategy dynamic loader supporting both CommonJS and ES Module environments with Next.js polyfills, an authentic 5-pattern examination fixture (`RAW_FIXTURE_TEXT`), and 112 assertions across 5 verification tiers.

---

## 2. Execution Command & Baseline Status

```bash
# Execute standalone test suite
node test-parser.js
```

### Baseline Execution Metrics (Pre-Implementation Upgrade)
- **Total Assertions**: 112
- **Passing Assertions**: 106
- **Failing Assertions**: 6
- **Exit Code**: `1` (Failing as expected on un-upgraded implementation)

### Defect Diagnostic Summary Caught by Test Harness
1. **Sanity Failure (Tier 1)**: Current parser returned 4 questions instead of 5 because `Q.1` stem on the same line was dropped, or `Statement I/II` sub-list triggered corruption.
2. **Fidelity Failure (Tier 3)**: Q3 (Biology cellular respiration statement question) was corrupted due to statement sub-list splitting.
3. **Metadata Failure (Tier 4)**: Q3 explanation was not extracted (remained empty or polluted adjacent question) and subject was misclassified.

---

## 3. Comprehensive Verification Coverage Checklist

| Check ID | Verification Area | Target Exam Pattern / Edge Case | Assertion Tier | Status in `test-parser.js` |
|---|---|---|---|---|
| **COV-01** | Question Count Cardinality | 5 diverse questions returned from raw multi-page text | Tier 1 | ✅ Covered |
| **COV-02** | Schema Contract Compliance | All required keys (`content`, `options`, `correct_option_index`, `correct_answer`, `explanation`, `subject`) | Tier 1 | ✅ Covered |
| **COV-03** | Stem Integrity | Non-empty question stem with question prefix stripped | Tier 1 | ✅ Covered |
| **COV-04** | Option Array Length | Exactly 4 options per question (`options.length === 4`) | Tier 2 | ✅ Covered |
| **COV-05** | Option Prefix Stripping | Removal of `(A)`, `(a)`, `[A]`, `(1)`, `1.` from option strings | Tier 2 | ✅ Covered |
| **COV-06** | Placeholder Exclusion | No `Option A` or `Option Placeholder` fallback artifacts | Tier 2 | ✅ Covered |
| **COV-07** | Formula Preservation | Physics Greek symbols `θ` and fractions `(2/3) g sin θ` preserved | Tier 3 | ✅ Covered |
| **COV-08** | Chemical Bracket Preservation | Square brackets `[Ni(CN)4]2-` not truncated in inline options | Tier 3 | ✅ Covered |
| **COV-09** | Statement Sub-List Resilience | `Statement I` & `Statement II` retained inside stem without splitting | Tier 3 | ✅ Covered |
| **COV-10** | Negative Number Preservation | Minus signs preserved for negative options (`-5`, `-1`) | Tier 3 | ✅ Covered |
| **COV-11** | Option D Cleanliness | No leaked `Ans:`, `KEY:`, or `Explanation:` in Option D | Tier 3 | ✅ Covered |
| **COV-12** | Watermark / Header Removal | `CONFIDENTIAL`, `ASENTRA PORTAL`, `Page X of Y` stripped | Tier 3 | ✅ Covered |
| **COV-13** | Letter Answer Key Mapping | `Ans: (B)` -> index 1, `KEY: C` -> index 2 | Tier 4 | ✅ Covered |
| **COV-14** | Numeric Answer Key Mapping | `Ans: 1` -> index 0 (1-based to 0-based conversion) | Tier 4 | ✅ Covered |
| **COV-15** | Explanation Extraction | Multi-line solution / explanation populated in `explanation` field | Tier 4 | ✅ Covered |
| **COV-16** | Subject Classification | Accurate domain classification (`Physics`, `Chemistry`, `Biology`, `Mathematics`) | Tier 4 | ✅ Covered |
| **COV-17** | Empty Input Tolerance | Empty string `""` returns `[]` gracefully without throwing | Tier 5 | ✅ Covered |
| **COV-18** | Noise-Only Tolerance | Pure headers/watermarks document returns 0 questions | Tier 5 | ✅ Covered |

---

## 4. Instructions for Implementer (Track B)

1. Implement the 5-stage deterministic parser in `src/app/api/admin/ai/parse-pdf/route.js`.
2. Export helper function `parseTextToQuestions` or `parseExamPdfText` (or ensure `parseExtractedText` is exported alongside `POST`).
3. Run `node test-parser.js`.
4. Ensure all 112 assertions pass and the command exits with code `0`.
