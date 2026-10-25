/**
 * The line under the examiner's name on ExamIntro and ExamGreeting, by the
 * device's local clock: "today" from 05:00 to 17:59, "tonight" otherwise.
 */
export function examinerSubtitle(now: Date = new Date()): string {
  const hour = now.getHours();
  return hour >= 5 && hour < 18 ? 'your examiner today' : 'your examiner tonight';
}
