import { screen } from '@testing-library/react';
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

  test('renders the social share buttons', () => {
    renderWithStore(<App />);
    for (const name of ['Share on Facebook', 'Share on LINE', 'Share on Telegram', 'Share on X']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });
});
