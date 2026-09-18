import { screen, fireEvent } from '@testing-library/react';
import * as drive from '../lib/googleDrive';
import Menu from './Menu';
import { renderWithStore } from '../test/renderWithStore';
import { WHATS_NEW_VERSION } from '../features/whatsNew/whatsNewSlice';
import { cloudInitialState } from '../features/cloud/cloudSlice';

vi.mock('../lib/googleDrive', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, isDriveConfigured: vi.fn(() => false), loadGis: vi.fn(() => Promise.resolve({})) };
});

afterEach(() => {
  drive.isDriveConfigured.mockReturnValue(false);
});

describe('Menu', () => {
  test('the cloud status sits in the right-hand column just before Settings', () => {
    renderWithStore(<Menu />);
    const cloud = screen.getByRole('button', { name: /^Google Drive backup:/ });
    const settings = screen.getByRole('button', { name: 'Settings' });
    expect(cloud.closest('.col-auto')).toHaveClass('ms-auto');
    expect(cloud.closest('.cloud-status').nextElementSibling).toBe(settings);
  });

  test('the save button precedes the cloud status icon when linked', () => {
    drive.isDriveConfigured.mockReturnValue(true);
    renderWithStore(<Menu />, {
      preloadedState: { cloud: { ...cloudInitialState, linked: true, fileId: 'f1' } },
    });
    const save = screen.getByRole('button', { name: 'Save to Drive' });
    const cloud = screen.getByRole('button', { name: /^Google Drive backup:/ });
    // when linked the status icon is a Dropdown toggle, wrapped in its .dropdown container
    expect(save.nextElementSibling).toBe(cloud.closest('.dropdown') ?? cloud);
    expect(save.nextElementSibling.contains(cloud)).toBe(true);
  });

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
