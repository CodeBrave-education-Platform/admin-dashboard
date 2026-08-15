# Orchestration Plan — PDF Parsing & Architecture Hardening

## Overview
Transform the admin dashboard's PDF parsing capabilities to accurately extract all questions, options, and correct answers from complex exam paper PDFs, with cost-effective architectural justification and robust programmatic verification.

## Phases & Milestones

### Phase 0: Survey & Scope Mapping
- **Action**: Spawn 3 parallel Explorers:
  - Explorer 1 (Codebase Structure & Existing PDF Parser): Analyze current PDF parsing implementation, routes, libraries, file structure, and data model.
  - Explorer 2 (Exam Paper Pattern & Test Case Requirements): Analyze question formats (single choice, multi-choice, tabular, inline options, Roman numeral matching, multi-line questions, complex answer keys, etc.) and specify requirements for `test-parser.js`.
  - Explorer 3 (Architecture & Cost-Benefit Analysis): Evaluate Regex vs LLM API vs Hybrid approach based on speed, accuracy, zero API cost vs cloud dependency, token costs, latency, privacy, and offline capabilities.
- **Output**: Merged findings in `PROJECT.md` with Feature Inventory, Architecture, Milestones, and Interface Contracts.

### Phase 1: Dual Track Execution
- **Track A: E2E & Programmatic Testing Track**
  - Milestone T1: Test Infrastructure & Runner (`test-parser.js` and test suite). Create 5+ diverse question formats test harness covering edge cases, unconventional formats, answer mappings.
  - Output: `TEST_INFRA.md` & `TEST_READY.md`.
- **Track B: Implementation Track**
  - Milestone M1: Core Extraction Engine & Regex/Parser Architecture Upgrade.
  - Milestone M2: Formatting Normalization, Multi-Option Mapping, Answer Key Extraction & Integration.
  - Milestone M3: Documentation & Architecture Justification (Cost vs Accuracy trade-offs, PR documentation).

### Phase 2: Final Verification & Gate Pass
- Milestone M4: 100% Test Suite Pass (Tiers 1-4) & Adversarial Coverage Hardening (Tier 5).
- Reviewers, Challengers, and Forensic Auditor verification.
- Victory Report to Sentinel.
