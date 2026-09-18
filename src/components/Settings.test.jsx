import { screen, fireEvent } from '@testing-library/react';
import Settings from './Settings';
import { renderWithStore } from '../test/renderWithStore';

const open = () => ({
  settings: {
    isRepeatable: true,
    showAnimation: true,
    animationType: 'default',
    displaySetting: true,
    animationTimeout: 500,
  },
});

describe('Settings', () => {
  test('is hidden until displaySetting is true', () => {
    renderWithStore(<Settings />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('links to the privacy policy and terms of service in a new tab', () => {
    renderWithStore(<Settings />, { preloadedState: open() });
    const privacy = screen.getByRole('link', { name: 'Privacy Policy' });
    const terms = screen.getByRole('link', { name: 'Terms of Service' });
    expect(privacy).toHaveAttribute('href', '/privacy.html');
    expect(terms).toHaveAttribute('href', '/terms.html');
    for (const link of [privacy, terms]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });

  test('toggling Repeatable Straw updates settings and clears history', () => {
    const { store } = renderWithStore(<Settings />, { preloadedState: open() });
    fireEvent.click(screen.getByLabelText('Repeatable Straw'));
    expect(store.getState().settings.isRepeatable).toBe(false);
    expect(store.getState().straw.history).toEqual([]);
  });

  test('OK closes the modal', () => {
    const { store } = renderWithStore(<Settings />, { preloadedState: open() });
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(store.getState().settings.displaySetting).toBe(false);
  });
});
