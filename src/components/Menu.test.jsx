import { screen, fireEvent } from '@testing-library/react';
import Menu from './Menu';
import { renderWithStore } from '../test/renderWithStore';
import { WHATS_NEW_VERSION } from '../features/whatsNew/whatsNewSlice';

describe('Menu', () => {
  test("What's new sits right after Help and reopens the modal", () => {
    const { store } = renderWithStore(<Menu />, {
      preloadedState: { whatsNew: { seenVersion: WHATS_NEW_VERSION } },
    });
    const help = screen.getByRole('button', { name: 'Help' });
    const whatsNew = screen.getByRole('button', { name: "What's new" });
    expect(help.nextElementSibling).toBe(whatsNew);

    fireEvent.click(whatsNew);
    expect(store.getState().whatsNew.seenVersion).toBeNull();
  });

  test('Settings is a gear icon button and is the last control', () => {
    const { store } = renderWithStore(<Menu />);
    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(settings.querySelector('svg')).not.toBeNull();
    expect(settings).not.toHaveTextContent('Settings');

    const buttons = screen.getAllByRole('button');
    expect(buttons[buttons.length - 1]).toBe(settings);
    expect(settings.closest('.col-auto')).toHaveClass('ms-auto');

    fireEvent.click(settings);
    expect(store.getState().settings.displaySetting).toBe(true);
  });
});
