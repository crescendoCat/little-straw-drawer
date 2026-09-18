import { screen, fireEvent } from '@testing-library/react';
import Tutorial from './Tutorial';
import { renderWithStore } from '../test/renderWithStore';
import { startTutorial } from '../features/tutorial/tutorialSlice';

describe('Tutorial', () => {
  test('renders nothing when inactive', () => {
    renderWithStore(<Tutorial active={false} />);
    expect(screen.queryByRole('button', { name: 'Skip tutorial' })).not.toBeInTheDocument();
  });

  test('shows a prominent skip button that ends the tutorial', () => {
    const { store } = renderWithStore(<Tutorial active={true} />);
    store.dispatch(startTutorial());
    const skip = screen.getByRole('button', { name: 'Skip tutorial' });
    expect(skip).toHaveTextContent('Skip tutorial');
    expect(skip).toHaveClass('btn-light');
    fireEvent.click(skip);
    expect(store.getState().tutorial.showTutorial).toBe('hide');
  });
});
