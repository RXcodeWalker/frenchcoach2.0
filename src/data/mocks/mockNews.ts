export interface NewsSnippet {
  id: string;
  date: string;
  headline: string;
  transcript: string;
  translation: string;
  keywords: string[];
  summaryPoints: string[];
}

export const MOCK_NEWS: NewsSnippet[] = [
  {
    id: 'news-1',
    date: '2026-05-15',
    headline: 'Festival de Cannes',
    transcript: 'Le Festival de Cannes a ouvert ses portes hier soir. De nombreuses stars internationales sont présentes sur la Croisette pour cette soixante-dix-neuvième édition. Le film d\'ouverture a reçu une ovation debout de dix minutes.',
    translation: 'The Cannes Film Festival opened its doors last night. Many international stars are present on the Croisette for this seventy-ninth edition. The opening film received a ten-minute standing ovation.',
    keywords: ['festival', 'cinéma', 'Cannes', 'stars', 'ouverture'],
    summaryPoints: [
      'Cannes Festival started yesterday',
      'Many international stars are present',
      '79th edition of the festival',
      'Opening film received a 10-minute standing ovation'
    ]
  },
  {
    id: 'news-2',
    date: '2026-05-14',
    headline: 'Exploit Spatial',
    transcript: 'Une équipe d\'astronautes européens a réussi à poser un rover sur un astéroïde lointain ce matin. C\'est une première historique qui permettra d\'étudier les origines de notre système solaire. La mission a duré plus de cinq ans.',
    translation: 'A team of European astronauts succeeded in landing a rover on a distant asteroid this morning. It is a historic first that will allow the study of the origins of our solar system. The mission lasted more than five years.',
    keywords: ['espace', 'astronaute', 'astéroïde', 'mission', 'système solaire'],
    summaryPoints: [
      'European astronauts landed a rover on an asteroid',
      'Historical first for space exploration',
      'Mission goal: study solar system origins',
      'Mission duration was over five years'
    ]
  },
  {
    id: 'news-3',
    date: '2026-05-13',
    headline: 'Météo Exceptionnelle',
    transcript: 'Une vague de chaleur inhabituelle touche la France cette semaine. Les températures dépassent les trente degrés dans le nord du pays, ce qui est rare pour un mois de mai. Les autorités conseillent de rester hydraté.',
    translation: 'An unusual heatwave is affecting France this week. Temperatures are exceeding thirty degrees in the north of the country, which is rare for the month of May. Authorities advise staying hydrated.',
    keywords: ['météo', 'chaleur', 'températures', 'mai', 'hydratation'],
    summaryPoints: [
      'Unusual heatwave in France this week',
      'Temperatures over 30°C in the north',
      'Rare weather for the month of May',
      'Authorities advise staying hydrated'
    ]
  }
];
