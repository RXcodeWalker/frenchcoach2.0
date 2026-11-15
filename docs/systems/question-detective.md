# Question Detective

A standalone Explore game that teaches Grade 6–7 learners **what each French question word asks for**. Answers are 1–3 words. It awards **no XP**, writes **no Session**, and stores only its own local ladder, mix-ups, cases and bests. Cite as `question-detective §N` — do not renumber.

Flag: `questionDetective` (`live`; rollback `coming-soon`). Route: `/question-detective`. Teacher filter: `?words=quand,combien`.

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

The reverse room: see an answer, pick the tool that would get it, then build the question from word tiles. The French question (and its audio) stays hidden until the tool is picked, because hearing it would give the word away.

## §5 Case files

Five short mysteries, each a **chain of three questions** followed by a report. A case is never "ask anyone anything": every step opens with what the detective already knows (the clue from the step before) and what to find out next, in English, naming the *kind* of answer wanted but never the French word. Example, *The late class*: "The whole class is late. Ask Sam why." → pourquoi → "Le bus n'est pas venu." → "No bus! Ask Inès how long they waited for it." → combien → "On a attendu vingt minutes." → "Twenty minutes… ask Omar how they got to school." → comment.

- **A step:** the learner picks the tool from **four** (the right one and three authored wrong ones, in a stable order that does not put the right one first), never all eight. The French question is shown with a blank where the tool goes (`Vous êtes en retard ___ ?`); the right tool fills it, the witness gives the clue in French with an English gloss, and the clue joins **Your notes**. A wrong tool gets the witness's confused reply and one plain line naming what that tool finds, then shuts that choice. A **Hint** ("You are looking for a reason") is available on request and appears by itself after two wrong tools. There is no skipping.
- **The report:** after the last clue the detective answers three 1–3 word questions using the notes (all notes stay on screen). A first miss offers one more try; a second miss shows the answer. The case is **closed** only when all three are right (retries count). Closing is saved the moment it happens, and the next unclosed case is offered.
- **Authoring rules** (`bank.test.ts`): every step has exactly one `___` in its question, a goal that does not contain the French word, an English gloss for the question and the clue, and exactly three wrong tools each with a reply. A step's goal must build on the clue before it.
- A case file writes no mix-up counts and no ladder result; it is the *why* before the drills.

## §6 Isolation

No XP, Session, mastery, evidence, analytics or scored-pipeline import (`detective.isolation.test.ts`). The only write is `STORAGE_KEYS.questionDetective`. Recorded Henri audio is not used (catalogue cap).
