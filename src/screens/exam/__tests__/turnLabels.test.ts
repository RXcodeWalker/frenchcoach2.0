import { describe, expect, it } from 'vitest';
import { buildTurnLabels } from '../turnLabels';
import type { ConductLogEntry, ExaminerActionKind } from '../../../domain/igcse/session/types';

type SessionPart = ConductLogEntry['part'];

let seq = 0;
function ex(part: SessionPart, action: ExaminerActionKind, questionId: string | null, text: string): ConductLogEntry {
  seq += 1;
  return { kind: 'examiner', seq, atS: seq, part, action, questionId, variant: null, text, trigger: 'scripted' };
}
function cand(part: SessionPart, questionId: string | null, transcript: string): ConductLogEntry {
  seq += 1;
  return { kind: 'candidate', seq, startS: seq, endS: seq, part, questionId, transcript } as ConductLogEntry;
}

function labelsOf(entries: ConductLogEntry[]): string[] {
  const labels = buildTurnLabels(entries);
  return entries.map((e) => labels.get(e.seq)?.label ?? '-');
}

describe('buildTurnLabels', () => {
  it('numbers a role play by task, so two-part tasks never push the count past 5', () => {
    // The original-practice-001 role play as reported: tasks 3, 4 and 5 are two-part.
    const entries = [
      ex('rolePlay', 'READ_MAIN', 'rp1', "Bonjour. Qu'est-ce que je peux faire pour vous ?"),
      cand('rolePlay', 'rp1', "je veux un billet pour Marseille s'il vous plaît"),
      ex('rolePlay', 'TRANSITION', null, "D'accord."),
      ex('rolePlay', 'READ_MAIN', 'rp2', 'Vous voulez partir à quelle heure ?'),
      cand('rolePlay', 'rp2', 'à 11h'),
      ex('rolePlay', 'TRANSITION', null, 'Merci.'),
      ex('rolePlay', 'READ_MAIN', 'rp3', 'Pourquoi avez-vous raté votre train ?'),
      cand('rolePlay', 'rp3', "parce que j'étais en retard"),
      ex('rolePlay', 'READ_MAIN', 'rp3', 'À quelle heure êtes-vous arrivé(e) à la gare ?'),
      cand('rolePlay', 'rp3', 'à midi'),
      ex('rolePlay', 'TRANSITION', null, "D'accord."),
      ex('rolePlay', 'READ_MAIN', 'rp4', "Qu'allez-vous faire à Marseille ?"),
      cand('rolePlay', 'rp4', 'je vais visiter des sites historiques'),
      ex('rolePlay', 'READ_MAIN', 'rp4', 'Combien de temps allez-vous rester là-bas ?'),
      cand('rolePlay', 'rp4', 'une semaine'),
      ex('rolePlay', 'TRANSITION', null, 'Merci.'),
      ex('rolePlay', 'READ_MAIN', 'rp5', 'Comment voulez-vous payer ?'),
      cand('rolePlay', 'rp5', 'par carte'),
      ex('rolePlay', 'READ_MAIN', 'rp5', 'Et pour le retour, quel jour voulez-vous voyager ?'),
      cand('rolePlay', 'rp5', 'dimanche'),
    ];
    expect(labelsOf(entries)).toEqual([
      'Q1', 'A1', '-',
      'Q2', 'A2', '-',
      'Q3', 'A3', 'Q3b', 'A3b', '-',
      'Q4', 'A4', 'Q4b', 'A4b', '-',
      'Q5', 'A5', 'Q5b', 'A5b',
    ]);
  });

  it('restarts in each part and keeps repeats, alternatives and extensions on their question', () => {
    const entries = [
      ex('rolePlay', 'READ_MAIN', 'rp1', 'Bonjour.'),
      cand('rolePlay', 'rp1', 'bonjour'),
      ex('topic1', 'READ_MAIN', 't1q1', "Comment vas-tu à l'école ?"),
      ex('topic1', 'REPEAT', 't1q1', "Comment vas-tu à l'école ?"),
      ex('topic1', 'READ_ALTERNATIVE', 't1q1', 'Tu prends le bus ?'),
      cand('topic1', 't1q1', 'je prends le bus'),
      ex('topic1', 'EXTENSION_PROMPT', 't1q1', 'Donne-moi plus de détails.'),
      cand('topic1', 't1q1', "c'est rapide"),
      ex('topic1', 'READ_MAIN', 't1q2', 'Combien de temps dure ton trajet ?'),
      cand('topic1', 't1q2', 'vingt minutes'),
      ex('topic1', 'FURTHER_QUESTION', null, 'Que penses-tu des bus ?'),
      cand('topic1', null, "c'est pratique"),
      ex('topic1', 'FURTHER_QUESTION', null, 'Comment ta famille se déplace-t-elle ?'),
      ex('topic1', 'REPEAT', null, 'Comment ta famille se déplace-t-elle ?'),
      cand('topic1', null, 'en voiture'),
      ex('topic1', 'END', null, 'Merci, c’est la fin.'),
    ];
    expect(labelsOf(entries)).toEqual([
      'Q1', 'A1',
      'Q1', 'Q1', 'Q1', 'A1', 'Q1', 'A1',
      'Q2', 'A2',
      'Q+1', 'A+1',
      'Q+2', 'Q+2', 'A+2',
      '-',
    ]);
    const labels = buildTurnLabels(entries);
    expect(labels.get(entries[1].seq)?.part).toBe('rolePlay');
    expect(labels.get(entries[5].seq)?.part).toBe('topic1');
  });
});
