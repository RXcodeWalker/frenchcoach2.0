# IGCSE Scorer — 05: Deprecated v1 Architecture (What Was Removed and Why)

> Part of the Cambridge IGCSE French 0520 Speaking Scorer architecture
> (split from `rubric-architecture-v3.md`). A short reference list of every
> piece of the original multi-board architecture that was deliberately
> removed, with the reasoning. Read this whenever touching old code being
> retired, or if you find yourself reintroducing a board abstraction —
> that's the signal to check this file.

## 7. What goes away from v1

- **`RubricConfig` generic schema, `RubricCriterion`, `RubricBand` types, `registry.ts`, `resolveRubric()`, `serialize.ts/toRubricContext`, `ExamBoard` union, `overall.method: 'strategy'`.** Reason: support for boards that do not exist.
- **Board-agnostic backend prompt injection.** There is one rubric; inline it once and call it `IGCSE_0520_RUBRIC`. The backend prompts become focused 0520 prompts with verbatim band descriptors.
- **`difficultyContext` reuse for rubric meaning.** Learner level is a coaching signal, not a rubric signal.
- **The triple system-prompt encoding (`SYSTEM_PROMPT`, `IGCSE_SYSTEM_PROMPT`, `_EVAL_SYSTEM_PROMPT`).** Replace with two prompts versioned in their own right: `evidence-prompt-vX` and `scoring-prompt-vX`.
- **`scoreToBand` / `bandToAdvice` named bands and 0–100 normalisation.** Replace with verbatim Cambridge bands at their actual mark ranges.
- **Weighted overall computation (0.35/0.35/0.30).** Replace with the additive Cambridge sum to /40.
- **The v1 "engine is the sole authority" hard separation.** Replaced by the three-layer hybrid with explicit contracts (§3.3–3.5).
- **Single-axis rubric versioning.** Replaced by full-stack `ScoringEnvelope` (§3.8).

---

