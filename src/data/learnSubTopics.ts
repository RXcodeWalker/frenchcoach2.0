/**
 * Closed sub-topic lists for Learn's optional "Focus" chips (plan Batch 3).
 * Learn-only: this is not the exam bank's `subTopic` enum (Syllabus p.14) and
 * never reaches the scorer, the demands hash or the backend. Every
 * `Question.subTopic` must be a key listed here for its own topic — enforced by
 * `learnBankLint` (run by `npm run learn:check`). Only the 16 core topics have
 * a list; the advanced topics hold one question each and are hidden.
 *
 * Adding or renaming a key means re-checking every question that uses it.
 */

export interface LearnSubTopic {
  /** Stable kebab-case id stored on `Question.subTopic`. */
  key: string;
  /** Learner-facing chip label (English, like the rest of the Learn setup UI). */
  label: string;
}

export const LEARN_SUB_TOPICS: Readonly<Record<string, readonly LearnSubTopic[]>> = {
  school: [
    { key: 'subjects', label: 'Subjects' },
    { key: 'school-day', label: 'My school day' },
    { key: 'rules-and-uniform', label: 'Rules & uniform' },
    { key: 'teachers-and-classmates', label: 'Teachers & classmates' },
    { key: 'exams-and-homework', label: 'Exams & homework' },
  ],
  hobbies: [
    { key: 'sport-and-active', label: 'Sport & active hobbies' },
    { key: 'music-books-film', label: 'Music, books & film' },
    { key: 'screens-and-games', label: 'Screens & games' },
    { key: 'creative-hobbies', label: 'Creative hobbies' },
    { key: 'free-time-routine', label: 'Free-time routine' },
  ],
  family: [
    { key: 'family-members', label: 'Family members' },
    { key: 'friends', label: 'Friends' },
    { key: 'parents-and-rules', label: 'Parents & rules' },
    { key: 'celebrations-and-traditions', label: 'Celebrations & traditions' },
    { key: 'generations', label: 'Generations' },
  ],
  holidays: [
    { key: 'past-holidays', label: 'Past holidays' },
    { key: 'future-trips', label: 'Future trips' },
    { key: 'destinations', label: 'Destinations' },
    { key: 'travel-preferences', label: 'Travel preferences' },
    { key: 'tourism-issues', label: 'Tourism' },
  ],
  home: [
    { key: 'my-home', label: 'My home & room' },
    { key: 'town-and-region', label: 'Town & region' },
    { key: 'things-to-do', label: 'Things to do' },
  ],
  future: [
    { key: 'work-and-careers', label: 'Work & careers' },
    { key: 'further-study', label: 'Study & skills' },
    { key: 'personal-life-plans', label: 'Personal life plans' },
    { key: 'future-world', label: 'The world ahead' },
  ],
  food: [
    { key: 'meals-and-habits', label: 'Meals & habits' },
    { key: 'favourite-foods', label: 'Favourite foods' },
    { key: 'cooking', label: 'Cooking' },
    { key: 'eating-out-and-shopping', label: 'Eating out & food shopping' },
    { key: 'health-and-sustainability', label: 'Health & sustainability' },
  ],
  environment: [
    { key: 'everyday-eco-habits', label: 'Everyday eco habits' },
    { key: 'waste-and-recycling', label: 'Waste & recycling' },
    { key: 'climate-and-energy', label: 'Climate & energy' },
    { key: 'nature-and-wildlife', label: 'Nature & wildlife' },
    { key: 'technology', label: 'Technology' },
  ],
  clothes: [
    { key: 'what-i-wear', label: 'What I wear' },
    { key: 'buying-clothes', label: 'Buying clothes' },
    { key: 'fashion-and-trends', label: 'Fashion & trends' },
    { key: 'fashion-and-society', label: 'Fashion & society' },
  ],
  animals: [
    { key: 'pets', label: 'Pets' },
    { key: 'wild-animals-and-zoos', label: 'Wild animals & zoos' },
    { key: 'protecting-wildlife', label: 'Protecting wildlife' },
    { key: 'animals-and-people', label: 'Animals & people' },
  ],
  transport: [
    { key: 'everyday-journeys', label: 'Everyday journeys' },
    { key: 'public-transport', label: 'Public transport' },
    { key: 'cars-and-traffic', label: 'Cars & traffic' },
    { key: 'long-distance-travel', label: 'Long-distance travel' },
    { key: 'future-of-transport', label: 'Future of transport' },
  ],
  jobs: [
    { key: 'dream-job', label: 'My dream job' },
    { key: 'jobs-around-me', label: 'Jobs around me' },
    { key: 'work-experience', label: 'Work experience' },
    { key: 'skills-and-study', label: 'Skills & study' },
    { key: 'working-world', label: 'The working world' },
  ],
  sports: [
    { key: 'playing-sport', label: 'Playing sport' },
    { key: 'teams-and-clubs', label: 'Teams & clubs' },
    { key: 'watching-sport', label: 'Watching sport' },
    { key: 'sport-and-society', label: 'Sport & society' },
  ],
  emotions: [
    { key: 'feelings-today', label: 'How I feel' },
    { key: 'stress-and-coping', label: 'Stress & coping' },
    { key: 'friends-and-support', label: 'Friends & support' },
    { key: 'emotions-and-society', label: 'Emotions & society' },
  ],
  arts: [
    { key: 'music', label: 'Music' },
    { key: 'film-and-tv', label: 'Film & TV' },
    { key: 'books-and-writing', label: 'Books & writing' },
    { key: 'visual-arts', label: 'Visual arts' },
    { key: 'art-and-society', label: 'Art & society' },
  ],
  shopping: [
    { key: 'shopping-habits', label: 'Shopping habits' },
    { key: 'money-and-saving', label: 'Money & saving' },
    { key: 'online-shopping', label: 'Online shopping' },
    { key: 'advertising-and-consumerism', label: 'Advertising & consumerism' },
  ],
};

/** The closed list for a topic; empty for a topic without one. */
export function subTopicsFor(topicKey: string): readonly LearnSubTopic[] {
  return LEARN_SUB_TOPICS[topicKey] ?? [];
}

/** Is `subTopic` a listed key for `topicKey`? */
export function isKnownSubTopic(topicKey: string, subTopic: string): boolean {
  return subTopicsFor(topicKey).some((s) => s.key === subTopic);
}
