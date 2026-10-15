// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { emptyJuniorState } from '../../domain/junior/state';

const app = { state: { junior: emptyJuniorState() }, dispatch: vi.fn() };
vi.mock('../../context/AppContext', () => ({ useApp: () => app }));

import { JuniorPlaytest } from '../JuniorPlaytest';

afterEach(cleanup);
const view = () => render(<MemoryRouter><JuniorPlaytest /></MemoryRouter>);

describe('JuniorPlaytest read-out', () => {
  it('says nothing has been played on an empty device', () => {
    app.state = { junior: emptyJuniorState() };
    view();
    expect(screen.getByTestId('pt-empty')).toBeTruthy();
  });

  it('reports rates and no breach within thresholds', () => {
    app.state = { junior: { ...emptyJuniorState(), outcomeTally: { got: 7, almost: 2, none: 1 }, silentTries: 3 } };
    view();
    expect(screen.getByTestId('pt-rate-none').textContent).toContain('10%');
    expect(screen.getByTestId('pt-verdict').textContent).toContain('No automatic threshold breached');
  });

  it('names every breached threshold', () => {
    app.state = { junior: { ...emptyJuniorState(), outcomeTally: { got: 2, almost: 5, none: 3 }, silentTries: 12 } };
    view();
    expect(screen.getByTestId('pt-verdict').textContent).toBe('Breached: none, almost, silentPerTurn.');
  });
});
