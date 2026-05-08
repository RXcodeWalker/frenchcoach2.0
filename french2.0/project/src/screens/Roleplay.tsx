import { useState } from 'react';
import { MessageSquare, ChevronRight, Mic, MicOff, RotateCcw, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROLEPLAY_SCENARIOS } from '../data/gameData';

type RoleplayState = 'select' | 'playing' | 'complete';

const SCENARIO_DIALOG: Record<string, { npc: string; next: string[] }[]> = {
  restaurant: [
    { npc: "Bonjour ! Bienvenue au restaurant. Une table pour combien de personnes ?", next: ["Pour deux personnes, s'il vous plaît.", "Pour une personne, merci."] },
    { npc: "Très bien ! Voici la carte. Qu'est-ce que vous désirez commander ?", next: ["Je voudrais le plat du jour.", "Qu'est-ce que vous recommandez ?"] },
    { npc: "Excellent choix ! Et comme boisson ?", next: ["Une carafe d'eau, s'il vous plaît.", "Je prendrais un verre de vin rouge."] },
    { npc: "Parfait. Je vous apporte ça tout de suite. Bon appétit !", next: ["Merci beaucoup !", "Est-ce que je peux avoir l'addition, s'il vous plaît ?"] },
  ],
  hotel: [
    { npc: "Bonsoir ! Bienvenue à l'Hôtel Lumière. Vous avez une réservation ?", next: ["Oui, j'ai réservé une chambre.", "Non, avez-vous des chambres disponibles ?"] },
    { npc: "Quel est votre nom, s'il vous plaît ?", next: ["Je m'appelle Martin.", "C'est au nom de Dupont."] },
    { npc: "Très bien. Voici votre clé, chambre 205. Petit-déjeuner inclus de 7h à 10h.", next: ["Merci ! À quelle heure est le check-out ?", "Est-ce que le WiFi est gratuit ?"] },
    { npc: "Le check-out est à midi. Bonne nuit et bon séjour !", next: ["Merci, bonne soirée !", "Pouvez-vous me recommander un restaurant ?"] },
  ],
};

export function Roleplay() {
  const { dispatch } = useApp();
  const [roleplayState, setRoleplayState] = useState<RoleplayState>('select');
  const [selectedScenario, setSelectedScenario] = useState<typeof ROLEPLAY_SCENARIOS[0] | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [history, setHistory] = useState<{ role: 'npc' | 'user'; text: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const dialog = selectedScenario ? (SCENARIO_DIALOG[selectedScenario.id] ?? SCENARIO_DIALOG.restaurant) : [];
  const currentTurn = dialog[turnIndex];

  const startScenario = (scenario: typeof ROLEPLAY_SCENARIOS[0]) => {
    if (scenario.difficulty > 2) return;
    setSelectedScenario(scenario);
    setTurnIndex(0);
    setHistory([{ role: 'npc', text: SCENARIO_DIALOG[scenario.id]?.[0]?.npc ?? SCENARIO_DIALOG.restaurant[0].npc }]);
    setRoleplayState('playing');
  };

  const selectResponse = (response: string) => {
    const newHistory = [...history, { role: 'user' as const, text: response }];
    const nextIndex = turnIndex + 1;
    if (nextIndex < dialog.length) {
      newHistory.push({ role: 'npc', text: dialog[nextIndex].npc });
      setTurnIndex(nextIndex);
      setHistory(newHistory);
    } else {
      setHistory(newHistory);
      setRoleplayState('complete');
      dispatch({ type: 'ADD_XP', amount: 30, x: 60, y: 20 });
    }
  };

  if (roleplayState === 'select') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">Roleplay Scenarios</h2>
          <p className="text-slate-400 mt-1">Practice real French conversations in everyday situations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLEPLAY_SCENARIOS.map(scenario => {
            const locked = scenario.difficulty > 2;
            return (
              <button
                key={scenario.id}
                onClick={() => startScenario(scenario)}
                disabled={locked}
                className={`group relative p-6 rounded-2xl border transition-all duration-200 text-left ${
                  locked
                    ? 'bg-slate-900/40 border-white/5 opacity-50 cursor-not-allowed'
                    : 'bg-slate-800/60 border-white/5 hover:border-white/15 hover:scale-[1.02]'
                }`}
              >
                {locked && (
                  <div className="absolute top-4 right-4">
                    <Lock size={16} className="text-slate-500" />
                  </div>
                )}
                <span className="text-3xl mb-4 block">{scenario.icon}</span>
                <h3 className="font-bold text-white mb-1">{scenario.title}</h3>
                <p className="text-sm text-slate-400 mb-4">{scenario.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`w-4 h-1.5 rounded-full ${i < scenario.difficulty ? 'bg-blue-500' : 'bg-slate-700'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">Difficulty {scenario.difficulty}/3</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (roleplayState === 'complete') {
    return (
      <div className="max-w-xl mx-auto py-8 text-center">
        <div className="glass-card p-8 rounded-2xl">
          <span className="text-5xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-black text-white mb-2">Conversation Complete!</h2>
          <p className="text-slate-400 mb-6">You successfully completed the roleplay scenario. Great French!</p>
          <div className="flex justify-center gap-3 mb-6">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/20">
              <p className="text-xs text-slate-400">Score</p>
              <p className="text-xl font-black text-emerald-400">8.2</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-blue-500/15 border border-blue-500/20">
              <p className="text-xs text-slate-400">XP Earned</p>
              <p className="text-xl font-black text-blue-400">+30</p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/20">
              <p className="text-xs text-slate-400">Turns</p>
              <p className="text-xl font-black text-amber-400">{history.filter(h => h.role === 'user').length}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRoleplayState('select')} className="flex-1 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-white font-semibold text-sm transition-all">
              <RotateCcw size={14} className="inline mr-2" />
              Try Another
            </button>
            <button onClick={() => selectedScenario && startScenario(selectedScenario)} className="flex-1 btn-primary py-3 rounded-xl font-semibold text-sm">
              Replay
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setRoleplayState('select')} className="text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        {selectedScenario && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{selectedScenario.icon}</span>
            <span className="font-bold text-white">{selectedScenario.title}</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <MessageSquare size={12} />
          Turn {turnIndex + 1}/{dialog.length}
        </div>
      </div>

      {/* Conversation History */}
      <div className="glass-card p-5 rounded-2xl mb-4 space-y-4 max-h-80 overflow-y-auto">
        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${
              msg.role === 'npc' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'
            }`}>
              {msg.role === 'npc' ? '🤖' : '👤'}
            </div>
            <div className={`max-w-[75%] p-3 rounded-xl text-sm ${
              msg.role === 'npc'
                ? 'bg-slate-800 border border-white/5 text-slate-200'
                : 'bg-blue-500/20 border border-blue-500/20 text-blue-100'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Response Options */}
      {currentTurn && turnIndex > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Choose your response:</p>
            <button onClick={() => setShowHints(!showHints)} className="text-xs text-amber-400 hover:text-amber-300">
              {showHints ? 'Hide' : 'Show'} translation
            </button>
          </div>
          {currentTurn.next.map((response, i) => (
            <button
              key={i}
              onClick={() => selectResponse(response)}
              className="w-full p-4 rounded-xl border border-white/5 bg-slate-800/50 hover:bg-slate-700/50 hover:border-blue-500/30 transition-all duration-200 text-left group"
            >
              <p className="text-sm text-white font-medium group-hover:text-blue-300 transition-colors">{response}</p>
            </button>
          ))}
        </div>
      )}

      {/* First turn - show options too */}
      {currentTurn && turnIndex === 0 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">How will you respond?</p>
          {currentTurn.next.map((response, i) => (
            <button
              key={i}
              onClick={() => selectResponse(response)}
              className="w-full p-4 rounded-xl border border-white/5 bg-slate-800/50 hover:bg-slate-700/50 hover:border-blue-500/30 transition-all duration-200 text-left group"
            >
              <p className="text-sm text-white font-medium group-hover:text-blue-300 transition-colors">{response}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
