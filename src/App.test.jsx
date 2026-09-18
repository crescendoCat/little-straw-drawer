import { screen, fireEvent } from '@testing-library/react';
import { tutorialDefault } from './features/tutorial/tutorialSlice';
import App from './App';
import { renderWithStore } from './test/renderWithStore';

// @lucky-canvas/react draws on a <canvas>, which jsdom does not implement.
vi.mock('@lucky-canvas/react', () => ({
  LuckyWheel: () => <div data-testid="lucky-wheel" />,
}));

describe('App', () => {
  test('renders the default straws', () => {
    renderWithStore(<App />);
    expect(screen.getByText('Some')).toBeInTheDocument();
    expect(screen.getByText('Little')).toBeInTheDocument();
    expect(screen.getByText('Straw')).toBeInTheDocument();
  });

  test('renders the result card with the empty hint', () => {
    renderWithStore(<App />);
    expect(document.getElementById('drawing-result-card')).toBeInTheDocument();
    expect(screen.getByText(/No results here/)).toBeInTheDocument();
  });

  test("does not run the tutorial while What's New is open, even if 'show' was persisted", () => {
    renderWithStore(<App />, {
      preloadedState: { tutorial: { ...tutorialDefault, showTutorial: 'show' } },
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Skip tutorial' })).not.toBeInTheDocument();
  });

  test('Show Tutorial closes the modal and starts the tutorial', async () => {
    renderWithStore(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Show Tutorial' }));
    expect(await screen.findByRole('button', { name: 'Skip tutorial' })).toBeInTheDocument();
  });

  test('renders the social share buttons', () => {
    renderWithStore(<App />);
    for (const name of ['Share on Facebook', 'Share on LINE', 'Share on Telegram', 'Share on X']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });
});
