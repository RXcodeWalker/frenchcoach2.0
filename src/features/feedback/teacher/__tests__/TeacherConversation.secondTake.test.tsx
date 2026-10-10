// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
// Each control gets its own recording state, as in the app.
vi.mock('../../../recording/useRecording', async () => {
  const { useState } = await import('react');
  return {
    useRecording: () => {
      const [isRecording, setIsRecording] = useState(false);
      return {
        isRecording,
        sttSupported: true,
        start: () => setIsRecording(true),
        stop: async () => {
          setIsRecording(false);
          return '';
        },
      };
    },
  };
});

import { buildTeacherScript } from '../buildTeacherScript';
import { TeacherConversation } from '../TeacherConversation';
import type { FeedbackPointGroup } from '../../components/FeedbackPointList';

const groups: FeedbackPointGroup[] = [
  { heading: 'Fix these first', tone: 'bad', points: [{ kind: 'fix', quote: "j'ai allé", correction: 'je suis allé' }] },
];
const lines = buildTeacherScript({ register: 'coach', transcript: "Hier j'ai allé au cinéma.", groups, secondTake: true });

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

describe('TeacherConversation — Second take (Batch 6c)', () => {
  it('ends with the invitation and the Second take control', () => {
    const { container } = render(<TeacherConversation lines={lines} revealKey={{}} tryFirstHeading="Fix these first" />);
    expect(container.querySelector('[data-role="secondTake"]')?.textContent).toBe('Now say it again, and use the fixes.');
    expect(screen.getByRole('button', { name: 'Record my second take' })).toBeTruthy();
  });

  it('has no Second take control when the script does not offer one', () => {
    const plain = buildTeacherScript({ register: 'coach', transcript: 'x', groups });
    render(<TeacherConversation lines={plain} revealKey={{}} tryFirstHeading="Fix these first" />);
    expect(screen.queryByRole('button', { name: 'Record my second take' })).toBeNull();
  });

  it('one microphone at a time: a nudge recording locks the Second take, and the other way round', () => {
    render(<TeacherConversation lines={lines} revealKey={{}} tryFirstHeading="Fix these first" />);
    const second = () => screen.getByRole('button', { name: 'Record my second take' }) as HTMLButtonElement;
    const nudge = () => screen.getByRole('button', { name: 'Say your fix' }) as HTMLButtonElement;

    fireEvent.click(nudge());
    expect(second().disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Stop and check what you said' }));
  });

  it('a recording Second take locks the nudge', () => {
    render(<TeacherConversation lines={lines} revealKey={{}} tryFirstHeading="Fix these first" />);
    fireEvent.click(screen.getByRole('button', { name: 'Record my second take' }));
    expect((screen.getByRole('button', { name: 'Say your fix' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
