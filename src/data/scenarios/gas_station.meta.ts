import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `fuel` branch already had `capture` at `fuel_start`
 * (pump number) and `intents` at `ask_payment` — 4 turns, 2 mission-legal
 * points, just under the plan's >=5 turn target. This pass splits
 * `fuel_start` into a fuel-type `capture` followed by a new `ask_fuel_pump`
 * (capture) to reach 5 turns / 3 points. Only `fuel` is authored; the other
 * 9 `start` side-intents remain unauthored (Stage 9 backlog).
 */
export const gasStationMeta: ScenarioMeta = {
  id: 'gas_station',
  title: 'Gas Station',
  titleFr: 'La Station-Service',
  emoji: '⛽',
  tier: 3,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Employé de station-service',
    roleFr: "l'employé",
    roleEn: 'gas station attendant',
    emoji: '🧑‍🔧',
    register: 'informal',
  },
  briefingEn:
    "You're at a gas station. Say you want fuel, say which type and pump, then confirm how you'll pay.",
  branches: {
    fuel: {
      labelEn: 'Buy fuel',
      missions: [
        {
          id: 'gas_ask_fuel',
          en: 'Say you want fuel',
          modelFr: "C'est pour de l'essence.",
          requires: [{ kind: 'intent', state: 'start', intent: 'fuel' }],
        },
        {
          id: 'gas_say_fuel_type',
          en: 'Say what type of fuel you need',
          modelFr: 'Du Sans Plomb 95, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'fuel_start', slot: 'fuel_type', minWords: 2 }],
        },
        {
          id: 'gas_say_pump_number',
          en: 'Say which pump you used',
          modelFr: "C'est la pompe numéro trois.",
          requires: [{ kind: 'slot', state: 'ask_fuel_pump', slot: 'pump_number', minWords: 2 }],
        },
        {
          id: 'gas_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'gas_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'fuel', terms: ['essence', "de l'essence"], priority: 1 },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
