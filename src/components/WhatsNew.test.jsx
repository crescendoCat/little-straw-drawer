import { screen, fireEvent } from '@testing-library/react';
import WhatsNew from './WhatsNew';
import { renderWithStore } from '../test/renderWithStore';
import { WHATS_NEW_VERSION, WHATS_NEW_NOTES } from '../features/whatsNew/whatsNewSlice';

describe('WhatsNew', () => {
  test('shows the notes for a first-time user', () => {
    renderWithStore(<WhatsNew />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText("What's new")).toBeInTheDocument();
    for (const note of WHATS_NEW_NOTES) {
      expect(screen.getByText(note.title)).toBeInTheDocument();
    }
  });

  test('renders nothing once the current version was seen', () => {
    renderWithStore(<WhatsNew />, {
      preloadedState: { whatsNew: { seenVersion: WHATS_NEW_VERSION } },
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('OK marks the version as seen without starting the tutorial', () => {
    const { store } = renderWithStore(<WhatsNew />);
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(store.getState().whatsNew.seenVersion).toBe(WHATS_NEW_VERSION);
    expect(store.getState().tutorial.showTutorial).toBe('hide');
  });

  test('Show Tutorial marks seen and starts the tutorial', () => {
    const { store } = renderWithStore(<WhatsNew />);
    fireEvent.click(screen.getByRole('button', { name: 'Show Tutorial' }));
    expect(store.getState().whatsNew.seenVersion).toBe(WHATS_NEW_VERSION);
    expect(store.getState().tutorial.showTutorial).toBe('show');
    expect(store.getState().tutorial.currentPosition).toBe(0);
  });

  test('Show Tutorial is the right-most footer action', () => {
    renderWithStore(<WhatsNew />);
    const footerButtons = screen.getAllByRole('button').filter((b) => b.closest('.modal-footer'));
    expect(footerButtons.map((b) => b.textContent)).toEqual(['OK', 'Show Tutorial']);
  });

  test('the header close button also dismisses', () => {
    const { store } = renderWithStore(<WhatsNew />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(store.getState().whatsNew.seenVersion).toBe(WHATS_NEW_VERSION);
  });
});
