# IGCSE Scorer — 04: Front-of-Pipeline (STT, Transcripts, Questions)

> Part of the Cambridge IGCSE French 0520 Speaking Scorer architecture
> (split from `rubric-architecture-v3.md`). Covers speech-to-text model
> choice and WER targets, transcript quality handling (disfluency,
> self-correction), accent handling, and the original-question-bank /
> copyright constraint. Primary reference for **S3, S4, S10, S13**.

## 6. Front of the pipeline — the part that actually breaks first

A scorer that gets a perfect 40/40 reading from a transcript that misheard "j'ai mangé" as "j'ai manger" has graded a different student.

### 6.1 Speech-to-text

- **Default to a French-tuned model**, not a general one. Whisper large-v3 or a hosted equivalent (e.g. Deepgram nova French) is the floor; specialist French ASRs (Speechmatics French, Voxist) are alternatives to evaluate during Phase A.
- **Validate WER on the corpus before trusting the scorer downstream.** Target word error rate ≤ 10% on clean recordings of intermediate French speakers; ≤ 18% on noisy/heavy-accent samples. Above either, the scorer must refuse to score and surface "transcript quality too low".
- **Force language code `fr` explicitly.** Whisper auto-detect routinely misroutes hesitant French as English when the speaker is anglophone.
- **Two-pass transcription for low-confidence spans:** if the ASR returns a low confidence on a span, re-run that span with biased decoding (prompt with expected domain vocabulary for the topic conversation) and present the user with the corrected version to confirm.
- **Persist word-level confidence.** Layer 1 uses these to discount evidence drawn from spans where it might be mishearing. Layer 3 uses aggregate confidence to gate scoring.
- **Externally recorded tests (teacher-conducted):** transcribe **both** speakers with diarization. Detect and annotate examiner repetitions and alternative-question usage — alternative questions are identifiable by matching examiner utterances against the question bank's alternative variants. Annotated conduct events feed the session-evidence fields in `EvidenceProfile` (`repetitions_used`, `alternative_triggered`, `extension_questions_asked`, `response_duration_s` per question). These recordings and the Teacher's Notes (TN) booklet remain **confidential — internal scoring and validation use only**, never redistributed, never pooled into any shared corpus.

### 6.2 Transcript quality

- **Disfluency-aware normalisation:** preserve hesitations (`euh`, `ben`, `hmm`) as Layer 1 evidence but strip them from the version shown to the grammar-error detector to reduce false positives.
- **Self-correction handling:** when the candidate restarts a clause, the scorer treats the corrected version as the assessable utterance, not the broken one. Examiners do this automatically.
- **User-visible transcript review step:** before scoring, the candidate sees the transcript and can correct mishearings. This is the single highest-leverage UX choice in the whole app and also generates free corpus data. The `ScoringEnvelope` records whether the transcript was user-corrected.

### 6.3 Accents and hesitations

- **English-accented French is a known weak spot for English-trained ASR.** Test explicitly with the candidate's own voice early and often. If WER on the candidate's own recordings is materially worse than on the rest of the corpus, prompt-bias the ASR with topic vocabulary; consider a fine-tune at Phase C scale.
- **Hesitations themselves are not penalised by Cambridge per se** in the current syllabus (Impression is gone), but extreme hesitation density bleeds into Communication and Quality of Language by reducing coherent output. Layer 1 captures filler density as a signal; Layer 2 judges whether it actually impaired communication.

### 6.4 Question authenticity and copyright

- **Real Cambridge role-play cards and topic-conversation questions are UCLES copyright** and the teacher/examiner booklet is explicitly confidential. They cannot be ingested or redistributed.
- **Build an original question bank modelled on the published structure**, not copied from it. Role play: 5 transactional tasks per scenario, drawn from the syllabus topic areas (A: Everyday activities; B: Personal and social life; C: World around us; D: World of work; E: International world), in the same instruction style ("greet…", "say that you have a reservation…", "choose between two options…", "thank and ask one question"). Topic conversations: 5 open questions per topic with one alternative per main question (Cambridge requires alternatives to support weaker candidates).
- **Quality control by a French teacher.** Every question reviewed by a 0520-familiar teacher before it enters the bank. Tag by topic area, sub-topic, target structures (past expected, opinion expected, future expected), **`expected_time_frame`** (`past` | `present` | `future` | `conditional` — derived from cue words for Layer 1 time-frame alignment), difficulty. For role-play tasks, tag **`parts_expected`** (1 or 2). Include **alternative-question variants** for each main topic question so examiner-speech annotation can match them.
- **Honest framing:** the app says "modelled on Cambridge IGCSE 0520 format. Original questions written for practice — not past paper questions." This protects copyright and sets honest expectations.
- **No bulk PDF scraping of past papers.** Personal-use upload by a candidate for their own practice is acceptable; redistributing, training on, or pooling them into a corpus is not.
- **June 2024 TN confidentiality:** the June 2024 Teacher's Notes role-play cards and topic questions are confidential UCLES material — they must **not** seed the original question bank's content, only its structure and instruction style (which was already the rule). The Principal Examiner Report's guidance on differentiated further questions **may** inform how the app generates its (original) further/extension questions for topic conversations.

### 6.5 Examiner-simulation conduct rules

For app-conducted practice sessions (implemented in roadmap **S10**), the session engine must simulate a Cambridge examiner's conduct faithfully enough that `EvidenceProfile` session-evidence fields are trustworthy:

- Read questions **exactly as authored** in the question bank — repeat but **never rephrase**.
- **Role play:** no extension questions; move through the 5 tasks in order.
- **Topic conversation Q1–Q5:** repeat the main question first, then offer the alternative if needed, then move on — do not skip ahead.
- **Two-part questions** (role-play PAUSE tasks; topic questions whose prompt embeds a follow-up such as *"…? Pourquoi ?"*): deliver the two parts as **separate examiner utterances** — the first part, then, once it is answered, a **distinct second-part prompt** (authored as `secondPartText`), never a re-read of the main text. A failed second part gets **one verbatim repeat**, then the engine advances; the **alternative is never offered for a second part** (and a question answered via its alternative skips its second part entirely, since the alternative replaces the two-part main question).
- Encourage fuller responses on thin answers with two **original, app-authored** extension prompts (`tu`-register, alternated deterministically): *"Donne-moi plus de détails."* / *"Peux-tu me dire autre chose à ce sujet ?"*. These are original content, not copied from confidential Teacher's Notes wording — Cambridge's own further-questions guidance (§6.4 above) may inform *when* to probe, but the wording itself must never be TN-verbatim.
- Cap examiner-chosen further questions at **2 per topic** (beyond the scripted Q1–Q5 and their alternatives). These are **authored, on-topic, `tu`-register questions** per topic (`SessionQuestionSet.furtherQuestions`, a fixed two-question tuple per topic so an under-supplied set is a compile error), asked in order — never a synthesised placeholder string.
- Target **~4 minutes** of candidate speaking time per topic conversation.
- **Log every conduct event** (repetition, alternative triggered, extension asked, task part addressed, timestamps) to the session log that Layer 1 consumes.

---

