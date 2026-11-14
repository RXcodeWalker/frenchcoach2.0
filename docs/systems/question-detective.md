# Question Detective

A standalone Explore game that teaches Grade 6–7 learners **what each French question word asks for**. Answers are 1–3 words. It awards **no XP**, writes **no Session**, and stores only its own local ladder, mix-ups, cases and bests. Cite as `question-detective §N` — do not renumber.

Flag: `questionDetective` (`coming-soon` until switched live; preview `?ff_questionDetective=live`). Route: `/question-detective`. Teacher filter: `?words=quand,combien`.

## §1 The eight tools

Each word finds one kind of thing:

| Word | Finds |
|---|---|
| qui | a person |
| où | a place |
| quand | a time |
| combien | a number |
| comment | a way or manner |
| pourquoi | a reason (often « parce que ») |
| quel / quelle | a choice |
| qu’est-ce que | a thing or action |

All three sentence positions appear: end (« Tu habites où ? »), front (« Où habites-tu ? »), est-ce que (« Où est-ce que tu habites ? »). The question word is highlighted wherever it sits.

## §2 Answer it

A round of eight questions. Each word climbs its own ladder: **tap → type → say**. Three rights in a row climb; a miss never drops the rung (that word just comes up more often).

- **Tap:** three choices. The two wrong ones are a *different answer type*, never just wrong vocabulary.
- **Type:** accents optional, article flexible, one typo is “almost”.
- **Say:** Chrome captions, no AI quota, no pronunciation mark. Wrapped in `SpeakingConsentGate`. Without speech recognition or with pending guardian consent, the ladder stays on type and says why.

Two hints: (1) the tool’s name and icon; (2) what it finds (“this one wants a place”).

## §3 Mix-ups

A known answer of another type is a **mix-up**, named in plain words (“où finds a place, but that answers quand”). Counts are stored per pair on this device. A “Tricky pairs” round drills the learner’s top two confusions.

## §4 Ask it

The reverse room: see an answer, pick the tool that would get it, then build the question from word tiles.

## §5 Case files

Five short mysteries. Asking a witness the right tool gives a clue; the wrong tool gets an answer to *that* word. Close the case by answering three 1–3 word questions.

## §6 Isolation

No XP, Session, mastery, evidence, analytics or scored-pipeline import (`detective.isolation.test.ts`). The only write is `STORAGE_KEYS.questionDetective`. Recorded Henri audio is not used (catalogue cap).
