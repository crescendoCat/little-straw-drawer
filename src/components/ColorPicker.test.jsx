import { render, screen, fireEvent } from '@testing-library/react';
import ColorPicker, { DEFAULT_SWATCHES } from './ColorPicker';

describe('ColorPicker', () => {
  test('renders one button per swatch and marks the current color active', () => {
    render(<ColorPicker color={{ r: 255, g: 105, b: 0, a: 1 }} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(DEFAULT_SWATCHES.length);
    expect(screen.getByLabelText('#FF6900')).toHaveClass('active');
    expect(screen.getByLabelText('#FCB900')).not.toHaveClass('active');
  });

  test('clicking a swatch fires onChange and onSelect with an rgb object', () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<ColorPicker color={{ r: 0, g: 0, b: 0, a: 1 }} onChange={onChange} onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText('#0693E3'));
    const expected = { r: 6, g: 147, b: 227, a: 1 };
    expect(onChange).toHaveBeenCalledWith(expected);
    expect(onSelect).toHaveBeenCalledWith(expected);
  });

  test('typing a full hex value fires onChange but not onSelect', () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    render(<ColorPicker color={{ r: 0, g: 0, b: 0, a: 0.5 }} onChange={onChange} onSelect={onSelect} />);
    fireEvent.change(screen.getByLabelText('Hex color'), { target: { value: '#ff0000' } });
    expect(onChange).toHaveBeenLastCalledWith({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('falls back to white when no color is given', () => {
    render(<ColorPicker />);
    expect(screen.getByLabelText('Hex color')).toHaveValue('FFFFFF');
  });
});
