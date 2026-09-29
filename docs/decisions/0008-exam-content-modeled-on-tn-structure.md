# 0008 — Exam content is modeled on the Teacher's Notes structure, never their wording

Date: 2026-09-27
Status: Accepted

## Decision

Exam Sim is meant to run like the real Cambridge 0520/03 speaking test, so the question bank's
**structure** follows the current Teacher/Examiner Notes: which tasks and questions are two-part,
where alternatives appear, the time frames Q3–Q5 cover, the examiner's register, and the topic-area
pairing. The notes' conduct rules are specified in `docs/systems/exam-conduct-0520.md`, cited by
page only.

Every question's **wording** stays original. Nothing from the notes' scripts (scenarios, role-play
questions, topic questions, alternatives, further questions) is copied, paraphrased or translated
into the repo, and the booklet itself is never committed. The one exception is the notes' own
example extension prompts, which are conduct prompts rather than script content (exam-conduct §14).

Originality is checked by a local-only script that reads the notes' text from a path **outside**
both repositories and never writes into either. A set becomes `status: approved` only after a
native or near-native linguistic review of its French.

This supersedes the clean-room rule in `docs/guides/content-authoring.md` §0 ("never open a
Teacher's Notes booklet"). That section is rewritten when the content is (Batch 5 of the 0520
conduct plan); until then, this ADR is the authority where the two disagree.

## Why

The clean-room rule protected against copying confidential material, but it also kept the content
from matching the exam it simulates. Four of the ten sets break the notes' topic-area pairing, the
role play has one two-part task where the notes' scripts have two or three, and Q1–Q2 carry
alternatives the notes never provide. A candidate practising on that content practises a different
test.

Modeling the structure while keeping the wording original gets the fidelity without reproducing the
notes. The local originality check keeps accidental overlap out without putting the notes'
text in either repository.

## Consequences

- Authoring rules derived from the notes can be enforced by `npm run authoring:check` (planned for
  Batch 4 of the 0520 conduct plan).
- Whoever authors content will have read the notes, so originality depends on the check and the
  review, not on authors never having seen them.
- If a later notes booklet changes a structural pattern, the authoring rules follow the newer
  booklet.

## Amendment — 2026-09-29: G2 waived for the ten 0520 sets

The Decision above says a set becomes `status: approved` only after native or near-native linguistic review (gate G2). The owner has **waived G2** for `original-practice-001`–`010`: they are approved on G0 (machine checks), G1 (self-review, including a naturalness pass over every spoken line) and the originality check, and their `review.notes` record "G2 waived by owner 2026-09-29; content is machine-authored and self-reviewed (G1)". Nothing else in this ADR changes: structure-modeled, original wording and the local-only originality check still apply, and G2 remains the gate for any new or changed set unless the owner waives it again.
