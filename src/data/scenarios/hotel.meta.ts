import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `no` (no reservation) branch's `next` chain already
 * reached 5 turns (`start→check_availability→offer_room→ask_id→give_key→
 * end_session`) but had 0 mission-legal points. This pass adds `capture` to
 * `check_availability` and `offer_room`, and turns `ask_id` into an
 * id_card/passport `intents` branch (was `next`-only). Only `no` (walk-in)
 * is authored; `yes` (→ `ask_reservation_name`) and the other 19 `start`
 * side-intents remain unauthored (Stage 9 backlog).
 */
export const hotelMeta: ScenarioMeta = {
  id: 'hotel',
  title: 'Hotel',
  titleFr: "L'Hôtel",
  emoji: '🏨',
  tier: 3,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Réceptionniste',
    roleFr: 'le/la réceptionniste',
    roleEn: 'hotel receptionist',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're checking in at a hotel without a reservation. Say how many nights and what room type you want, then show ID to get your key.",
  branches: {
    no: {
      labelEn: 'Check in without a reservation',
      missions: [
        {
          id: 'hotel_no_reservation',
          en: "Say you don't have a reservation",
          modelFr: "Non, je n'ai pas de réservation.",
          requires: [{ kind: 'intent', state: 'start', intent: 'no' }],
        },
        {
          id: 'hotel_say_nights',
          en: 'Say how many nights you want to stay',
          modelFr: 'Je voudrais rester deux nuits.',
          requires: [{ kind: 'slot', state: 'check_availability', slot: 'nights', minWords: 3 }],
        },
        {
          id: 'hotel_say_room_type',
          en: 'Say what type of room you want',
          modelFr: 'Une chambre double, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'offer_room', slot: 'room_type', minWords: 2 }],
        },
        {
          id: 'hotel_show_id_card',
          en: 'Say you have your ID card',
          modelFr: "J'ai ma carte d'identité.",
          requires: [{ kind: 'intent', state: 'ask_id', intent: 'id_card' }],
        },
        {
          id: 'hotel_show_passport',
          en: 'Say you have your passport',
          modelFr: 'J\'ai mon passeport.',
          requires: [{ kind: 'intent', state: 'ask_id', intent: 'passport' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'no', terms: ['pas de reservation', 'non'], priority: 1 },
    { state: 'start', intent: 'yes', terms: ['reservation'] },
    { state: 'ask_id', intent: 'id_card', terms: ["carte d'identite"], priority: 1 },
    { state: 'ask_id', intent: 'passport', terms: ['passeport'] },
  ],
};
