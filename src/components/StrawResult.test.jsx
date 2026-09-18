import { screen, fireEvent, act } from '@testing-library/react';
import StrawResult from './StrawResult';
import { renderWithStore } from '../test/renderWithStore';
import { addHistory } from '../features/straw/strawSlice';

const white = { r: 255, g: 255, b: 255, a: 1 };

describe('StrawResult', () => {
  test('shows an empty hint when there is no history', () => {
    renderWithStore(<StrawResult />);
    expect(screen.getByText(/No results here/)).toBeInTheDocument();
  });

  test('lists drawn results, newest first', () => {
    const { store } = renderWithStore(<StrawResult />);
    act(() => {
      store.dispatch(addHistory({ id: 0, name: 'Alpha', color: white }));
      store.dispatch(addHistory({ id: 1, name: 'Beta', color: white }));
    });
    const items = screen.getAllByText(/Alpha|Beta/).map((el) => el.textContent);
    expect(items).toEqual(['Beta', 'Alpha']);
    expect(screen.queryByText(/No results here/)).not.toBeInTheDocument();
  });

  test('clear button empties the history', () => {
    const { store } = renderWithStore(<StrawResult />);
    act(() => {
      store.dispatch(addHistory({ id: 0, name: 'Alpha', color: white }));
    });
    fireEvent.click(document.getElementById('btn-clear-results'));
    expect(store.getState().straw.history).toEqual([]);
  });
});
