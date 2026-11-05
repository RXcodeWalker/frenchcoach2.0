import { describe, it, expect } from 'vitest';
import { buildFeedbackEmail } from '../sendFeedbackDigest';

const row = {
  id: 'f1',
  created_at: '2026-11-04T10:00:00Z',
  user_id: null,
  kind: 'marking',
  message: 'Question 3 <b>was</b> marked wrong',
  contact_email: null,
  route: '/learn',
  user_agent: 'UA',
};

describe('buildFeedbackEmail', () => {
  it('tags the subject with the kind and escapes the message in HTML', () => {
    const email = buildFeedbackEmail(row);
    expect(email.subject).toBe('[FrenchCoach Marking] Question 3 <b>was</b> marked wrong');
    expect(email.html).toContain('&lt;b&gt;was&lt;/b&gt;');
    expect(email.html).not.toContain('<b>was</b>');
    expect(email.text).toContain('No email left');
    expect(email.text).toContain('Guest');
  });
});
