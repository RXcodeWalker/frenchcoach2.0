import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '../../components/motion/variants';
import { useApp } from '../../context/AppContext';
import { Table, type Column } from '../../components/ui/Table';
import { SKILL_DEFS } from '../../services/coaching/diagnosticEngine';

interface Row {
  id: string;
  name: string;
  pct: number;
  daysSince: number | null;
}

function daysSince(ts: number): number | null {
  if (!ts) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
}

export function SkillsTab() {
  const { state } = useApp();
  const { skillProfile } = state;
  const [sortDesc, setSortDesc] = useState(true);

  const rows: Row[] = Object.entries(SKILL_DEFS)
    .map(([id, def]) => ({ id, def, entry: skillProfile[id] }))
    .filter((r) => r.entry !== undefined)
    .map((r) => ({
      id: r.id,
      name: r.def.name,
      pct: Math.min(100, Math.round(r.entry!.score * 100)),
      daysSince: daysSince(r.entry!.lastSeen),
    }))
    .sort((a, b) => (sortDesc ? b.pct - a.pct : a.pct - b.pct));

  if (rows.length === 0) {
    return (
      <motion.div variants={fadeUp} className="surface rounded-card p-8 text-center">
        <p className="text-body-s text-ink-muted">
          Complete a practice session to see your skill breakdown.
        </p>
      </motion.div>
    );
  }

  const columns: Column<Row>[] = [
    { header: 'Skill', cell: (r) => r.name },
    {
      header: (
        <button
          type="button"
          onClick={() => setSortDesc((v) => !v)}
          className="text-eyebrow uppercase text-ink-subtle hover:text-ink-muted transition-colors duration-state ease-smooth"
        >
          Mastery {sortDesc ? '↓' : '↑'}
        </button>
      ),
      numeric: true,
      width: '96px',
      cell: (r) => `${r.pct}`,
    },
    {
      header: '',
      width: '120px',
      cell: (r) => (
        <div className="h-1.5 w-full rounded-pill bg-track overflow-hidden">
          <div className="h-full rounded-pill bg-progress" style={{ width: `${r.pct}%` }} />
        </div>
      ),
    },
    {
      header: 'Days',
      numeric: true,
      width: '56px',
      cell: (r) => <span className="text-ink-subtle">{r.daysSince == null ? '—' : r.daysSince}</span>,
    },
  ];

  return (
    <motion.div variants={fadeUp}>
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />
    </motion.div>
  );
}
