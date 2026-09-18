import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Share from './Share';

describe('Share', () => {
  const originalShare = navigator.share;

  afterEach(() => {
    if (originalShare === undefined) {
      delete navigator.share;
    } else {
      navigator.share = originalShare;
    }
  });

  test('renders nothing when the Web Share API is unavailable', () => {
    delete navigator.share;
    const { container } = render(<Share title="T" text="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('calls navigator.share with url, title and text', async () => {
    navigator.share = vi.fn().mockResolvedValue(undefined);
    render(<Share title="Mi Mi" text="hello" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalledTimes(1));
    expect(navigator.share).toHaveBeenCalledWith({
      url: document.location.href,
      title: 'Mi Mi',
      text: 'hello',
    });
  });

  test('swallows AbortError silently', async () => {
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    navigator.share = vi.fn().mockRejectedValue(abort);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    render(<Share title="T" text="x" />);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(navigator.share).toHaveBeenCalled());
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
