import { RoadmapLevel, RoadmapData, Feedback } from '../../types';
import { getStats } from '../analytics/analyticsService';
import { STORAGE_KEYS, storageGet } from '../persistence/storage';

export const ROADMAP_LEVELS: RoadmapLevel[] = [
  {
    id: "foundation",
    name: "Foundation",
    icon: "🌱",
    color: "#10B981",
    colorPale: "#D1FAE5",
    colorDark: "#059669",
    description: "Build core speaking confidence with basic structures and vocabulary.",
    gate: { avgSkill: 4.0, minSessions: 3 },
    nodes: [
      { id: "f1", title: "First Words",    desc: "Complete your first 2 speaking sessions",     type: "sessions",   req: 2 },
      { id: "f2", title: "Sentence Maker", desc: "Speak 40+ words in a single response",        type: "maxWords",   req: 40 },
      { id: "f3", title: "Daily Habit",    desc: "Complete 3 daily challenges",                 type: "challenges", req: 3 },
      { id: "f4", title: "Explorer",       desc: "Try 3 different practice topics",             type: "topics",     req: 3 },
      { id: "f5", title: "Foundation Gate","desc": "Achieve average skill score ≥ 4.0",         type: "avgSkill",   req: 4.0, isGate: true },
    ],
  },
  {
    id: "intermediate",
    name: "Intermediate",
    icon: "📈",
    color: "#3B82F6",
    colorPale: "#DBEAFE",
    colorDark: "#2563EB",
    description: "Develop fluency, reduce grammar errors, and expand vocabulary.",
    gate: { avgSkill: 6.0, fluency: 5.5, grammar: 5.5, minSessions: 8 },
    nodes: [
      { id: "i1", title: "Fluent Talker",     desc: "Reach fluency score ≥ 5.5",                  type: "skill",      req: { skill: "fluency",   val: 5.5 } },
      { id: "i2", title: "Grammar Grind",     desc: "Reach grammar score ≥ 5.5",                  type: "skill",      req: { skill: "grammar",   val: 5.5 } },
      { id: "i3", title: "Word Collector",    desc: "Save 10 words to Vocab Vault",               type: "vault",      req: 10 },
      { id: "i4", title: "Exam Preview",      desc: "Complete 1 IGCSE practice paper",            type: "igcse",      req: 1 },
      { id: "i5", title: "Conversationalist", desc: "Complete 3 roleplay scenarios",              type: "roleplay",   req: 3 },
      { id: "i6", title: "Intermediate Gate", desc: "Achieve average skill score ≥ 6.0",          type: "avgSkill",   req: 6.0, isGate: true },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    icon: "🔥",
    color: "#F59E0B",
    colorPale: "#FFFBEB",
    colorDark: "#D97706",
    description: "Master complex structures, precise vocabulary, and exam technique.",
    gate: { avgSkill: 7.5, vocabulary: 7.0, examResponse: 7.0, minSessions: 15 },
    nodes: [
      { id: "a1", title: "Vocab Master",   desc: "Reach vocabulary score ≥ 7.0",               type: "skill",       req: { skill: "vocabulary",    val: 7.0 } },
      { id: "a2", title: "Clear Speaker",  desc: "Reach pronunciation score ≥ 7.0",            type: "skill",       req: { skill: "pronunciation", val: 7.0 } },
      { id: "a3", title: "Exam Technique", desc: "Score 14+ / 20 on an IGCSE paper",           type: "igcseScore",  req: 14 },
      { id: "a4", title: "Marathon",       desc: "Speak 80+ words in a single response",       type: "maxWords",    req: 80 },
      { id: "a5", title: "Advanced Gate",  desc: "Achieve average skill score ≥ 7.5",          type: "avgSkill",    req: 7.5, isGate: true },
    ],
  },
  {
    id: "exam_ready",
    name: "Exam Ready",
    icon: "🏆",
    color: "#8B5CF6",
    colorPale: "#EDE9FE",
    colorDark: "#7C3AED",
    description: "Peak performance across all skill areas — ready for IGCSE success.",
    gate: null,
    nodes: [
      { id: "e1", title: "All-Rounder",    desc: "All skill scores reach 7.5+",                type: "allSkills",  req: 7.5 },
      { id: "e2", title: "Exam Champion",  desc: "Score 16+ / 20 on an IGCSE paper",          type: "igcseScore", req: 16 },
      { id: "e3", title: "Century",        desc: "Complete 100 speaking sessions",             type: "sessions",   req: 100 },
      { id: "e4", title: "IGCSE Ready",    desc: "All skill scores reach 8.0+",               type: "allSkills",  req: 8.0 },
    ],
  },
];

export const SKILL_INFO = {
  pronunciation: { label: "Pronunciation", icon: "🎙", desc: "How clearly your words are spoken" },
  fluency:       { label: "Fluency",       icon: "⚡", desc: "Speaking pace and natural delivery" },
  grammar:       { label: "Grammar",       icon: "📝", desc: "Accuracy of French grammar" },
  vocabulary:    { label: "Vocabulary",    icon: "📚", desc: "Range and variety of language" },
  examResponse:  { label: "Exam Response",  icon: "🎯", desc: "Performance in exam conditions" },
};

const KEY = STORAGE_KEYS.roadmap;

function loadData(): RoadmapData {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultData(), ...JSON.parse(raw) } : defaultData();
  } catch {
    return defaultData();
  }
}

function defaultData(): RoadmapData {
  return {
    skills: { pronunciation: 0, fluency: 0, grammar: 0, vocabulary: 0, examResponse: 0 },
    levelIndex: 0,
    completedNodes: [],
    lastEvalDate: null,
  };
}

function save(data: RoadmapData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or storage unavailable — degrade silently, never throw
  }
}

function blend(old: number, fresh: number) {
  const rounded = (v: number) => Math.round(v * 10) / 10;
  if (old <= 0) return rounded(fresh);
  return rounded(old * 0.65 + fresh * 0.35);
}

function calculateAvgSkill(skills: RoadmapData['skills']) {
  const vals = Object.values(skills).filter(v => v > 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

export function evaluateRoadmap(): RoadmapData {
  const stats = getStats();
  const sessions = stats.allSessions || [];
  const data = loadData();

  if (sessions.length === 0) return data;

  const recent = sessions.filter(s => (s as { aiFeedback?: Feedback }).aiFeedback).slice(0, 15);
  if (recent.length > 0) {
    let fluencySum = 0, fluencyN = 0;
    let grammarSum = 0, grammarN = 0;
    let vocabSum = 0, vocabN = 0;
    let examSum = 0, examN = 0;

    recent.forEach(s => {
      const ai = (s as { aiFeedback?: Feedback }).aiFeedback;
      if (!ai) return;

      if (typeof ai.scores?.fluency === "number" && ai.scores.fluency > 0) {
        fluencySum += ai.scores.fluency;
        fluencyN++;
      }

      const wc = Math.max(1, s.wordCount || 1);
      const errs = (ai.grammar?.critical?.length || 0) + (ai.grammar?.polish?.length || 0);
      const density = (errs / wc) * 100;
      grammarSum += Math.max(0, Math.min(10, 10 - density * 0.8));
      grammarN++;

      const sugg = (ai.vocabulary || []).length;
      vocabSum += Math.max(2, Math.min(9, 9 - sugg * 0.8));
      vocabN++;

      if (s.mode === "exam" && typeof s.score === "number") {
        examSum += (s.score / 20) * 10;
        examN++;
      } else if (typeof s.score === "number" && s.score > 0) {
        examSum += s.score;
        examN++;
      }
    });

    if (fluencyN > 0) data.skills.fluency = blend(data.skills.fluency, fluencySum / fluencyN);
    if (grammarN > 0) data.skills.grammar = blend(data.skills.grammar, grammarSum / grammarN);
    if (vocabN > 0) data.skills.vocabulary = blend(data.skills.vocabulary, vocabSum / vocabN);
    if (examN > 0) data.skills.examResponse = blend(data.skills.examResponse, examSum / examN);
  }

  data.lastEvalDate = new Date().toISOString();

  // Check Gates
  for (let li = data.levelIndex + 1; li < ROADMAP_LEVELS.length; li++) {
    const gate = ROADMAP_LEVELS[li].gate;
    if (!gate) continue;

    const avg = calculateAvgSkill(data.skills);
    const s = data.skills;
    const ok =
      avg >= gate.avgSkill &&
      stats.totalSessions >= (gate.minSessions || 0) &&
      (!gate.fluency      || s.fluency      >= gate.fluency) &&
      (!gate.grammar      || s.grammar      >= gate.grammar) &&
      (!gate.vocabulary   || s.vocabulary   >= gate.vocabulary) &&
      (!gate.examResponse || s.examResponse >= gate.examResponse);

    if (ok) data.levelIndex = li;
    else break;
  }

  // Check Nodes
  const done = new Set(data.completedNodes);
  const total = stats.totalSessions;
  const avgSkill = calculateAvgSkill(data.skills);
  const maxWords = sessions.reduce((m, s) => Math.max(m, s.wordCount || 0), 0);
  const challenges = sessions.filter(s => s.mode === 'challenge' || s.mode === 'rapid_fire').length;
  const igcse = sessions.filter(s => s.mode === 'exam');
  const roleplay = sessions.filter(s => s.mode === 'roleplay').length;
  const topicSet = new Set(sessions.filter(s => s.topicKey).map(s => s.topicKey));
  const maxIScore = igcse.reduce((m, s) => typeof s.score === 'number' ? Math.max(m, s.score) : m, 0);
  
  const vaultCount = storageGet<unknown[]>(STORAGE_KEYS.vault, []).length;

  ROADMAP_LEVELS.forEach((level, li) => {
    if (li > data.levelIndex + 1) return;
    level.nodes.forEach(node => {
      if (done.has(node.id)) return;
      let pass = false;
      const req = node.req;

      switch (node.type) {
        case "sessions":   pass = total >= (req as number); break;
        case "maxWords":   pass = maxWords >= (req as number); break;
        case "challenges": pass = challenges >= (req as number); break;
        case "topics":     pass = topicSet.size >= (req as number); break;
        case "avgSkill":   pass = avgSkill >= (req as number); break;
        case "skill": {
          const r = req as { skill: string; val: number };
          pass = (data.skills[r.skill as keyof RoadmapData['skills']] || 0) >= r.val;
          break;
        }
        case "vault":      pass = vaultCount >= (req as number); break;
        case "igcse":      pass = igcse.length >= (req as number); break;
        case "igcseScore": pass = maxIScore >= (req as number); break;
        case "roleplay":   pass = roleplay >= (req as number); break;
        case "allSkills":  pass = Object.values(data.skills).every(v => v >= (req as number)); break;
      }
      if (pass) done.add(node.id);
    });
  });

  data.completedNodes = Array.from(done);
  save(data);
  return data;
}

export function getRoadmapData(): RoadmapData {
  return loadData();
}

export function updateRoadmapPronunciation(wordProbs: { probability: number }[]) {
  if (!wordProbs || wordProbs.length === 0) return;
  const avgProb = wordProbs.reduce((sum, w) => sum + w.probability, 0) / wordProbs.length;
  const score = Math.round(avgProb * 100) / 10;
  const data = loadData();
  data.skills.pronunciation = blend(data.skills.pronunciation, score);
  save(data);
}
