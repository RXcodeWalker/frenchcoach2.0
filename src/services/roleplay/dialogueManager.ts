// Copied verbatim from engine/dialogueManager.js — minimal TS wrapper only
import type { ScenarioState } from '../../types';
import { detectIntents, extractEntities } from './intentMatcher';

const DEFAULT_FALLBACKS = [
  "Je n'ai pas tout à fait compris. Pouvez-vous préciser ?",
  "Pardon, je n'ai pas saisi. Pouvez-vous reformuler ?",
  "Excusez-moi, pouvez-vous le dire autrement ?",
  "Je ne suis pas sûr de comprendre. Pourriez-vous répéter ?",
];

export class DialogueManager {
  private scenario: Record<string, ScenarioState>;
  private state: string;
  private memory: Record<string, unknown>;
  private isFinished: boolean;
  private failCount: number;
  private history: { role: 'bot' | 'user'; text: string }[];

  constructor(scenario: Record<string, ScenarioState>) {
    this.scenario = scenario;
    this.state = "start";
    this.memory = {};
    this.isFinished = false;
    this.failCount = 0;
    this.history = [];
  }

  private getRandom<T>(arr: T | T[]): T {
    if (!Array.isArray(arr)) return arr;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private interpolate(text: string): string {
    if (!text) return "";
    return text.replace(/\{(.*?)\}/g, (_, inner: string) => {
      const [key, fallback] = inner.split("|");
      const val = this.memory[key.trim()];
      if (val !== undefined && val !== "") return String(val);
      return fallback !== undefined ? fallback.trim() : `[${key.trim()}]`;
    });
  }

  private checkCondition(condition: string): boolean {
    if (!condition) return true;
    if (condition.startsWith("!")) return !this.memory[condition.substring(1)];
    if (condition.includes("=")) {
      const [key, val] = condition.split("=");
      return String(this.memory[key.trim()]) === val.trim();
    }
    return !!this.memory[condition];
  }

  getPrompt(): string {
    const stateObj = this.scenario[this.state];
    if (!stateObj) { this.isFinished = true; return "Conversation terminée."; }

    let prompt: string | string[] | undefined;
    if (stateObj.conditionalPrompts) {
      for (const cp of stateObj.conditionalPrompts) {
        if (this.checkCondition(cp.condition)) { prompt = cp.prompt; break; }
      }
    }
    if (!prompt) prompt = stateObj.prompt;
    return this.interpolate(this.getRandom(prompt));
  }

  getOpeningPrompt(): string {
    this.state = "start";
    this.failCount = 0;
    this.memory = {};
    this.history = [];
    this.executeStateActions();
    const response = this.getPrompt();
    this.history.push({ role: "bot", text: response });
    return response;
  }

  private executeStateActions() {
    const stateObj = this.scenario[this.state];
    if (!stateObj) return;
    if (stateObj.memory) Object.assign(this.memory, stateObj.memory);
  }

  private transitionTo(nextState: string) {
    this.state = nextState;
    this.failCount = 0;
    this.executeStateActions();
    const newStateObj = this.scenario[this.state];
    if (newStateObj && !newStateObj.prompt && !newStateObj.conditionalPrompts && newStateObj.next) {
      this.transitionTo(newStateObj.next);
    }
  }

  handleInput(input: string): string {
    if (this.isFinished) return "Conversation terminée.";
    this.history.push({ role: "user", text: input });

    const entities = extractEntities(input);
    if (Object.keys(entities).length > 0) Object.assign(this.memory, entities);

    const globalIntents = detectIntents(input, ["restart", "stop", "help"], 3);
    if (globalIntents.includes("restart")) return this.getOpeningPrompt();
    if (globalIntents.includes("stop")) { this.isFinished = true; return "Au revoir ! (Session terminée)"; }

    const stateObj = this.scenario[this.state];
    const expectedIntents = stateObj?.intents ? Object.keys(stateObj.intents) : [];

    if (stateObj?.next && !stateObj?.intents) {
      this.transitionTo(stateObj.next);
      const response = this.getPrompt();
      this.history.push({ role: "bot", text: response });
      return response;
    }

    if (stateObj?.intents) {
      const detected = detectIntents(input, expectedIntents, 2);
      let nextState: string | null = null;
      for (const intent of detected) {
        if (stateObj.intents[intent]) { nextState = stateObj.intents[intent]; break; }
      }
      if (!nextState && stateObj.intents["default"]) nextState = stateObj.intents["default"];

      if (nextState) {
        this.transitionTo(nextState);
        const response = this.getPrompt();
        this.history.push({ role: "bot", text: response });
        return response;
      }

      this.failCount++;
      let msg = this.getRandom(DEFAULT_FALLBACKS);
      if (this.failCount >= 3) {
        let recovery = stateObj.next;
        if (!recovery && stateObj.intents) {
          if (stateObj.intents["no"]) recovery = stateObj.intents["no"];
          else if (stateObj.intents["yes"]) recovery = stateObj.intents["yes"];
          else recovery = Object.values(stateObj.intents)[0];
        }
        if (recovery) {
          this.transitionTo(recovery);
          const response = msg + " " + this.getPrompt();
          this.history.push({ role: "bot", text: response });
          return response;
        }
      }
      this.history.push({ role: "bot", text: msg });
      return msg;
    }

    this.isFinished = true;
    return "Conversation terminée.";
  }

  getMemory() { return this.memory; }
  getHistory() { return this.history; }
  getQuickReplies(): string[] { return (this.scenario[this.state] as unknown as { quickReplies?: string[] })?.quickReplies ?? []; }
  isDone() { return this.isFinished || this.state === "end" || !this.scenario[this.state]; }
}
