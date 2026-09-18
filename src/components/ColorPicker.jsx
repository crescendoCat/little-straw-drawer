import PropTypes from 'prop-types';
import { HexColorInput } from 'react-colorful';
import { hexStr2RgbObj, rgbObj2HexStr } from '../utils';
import './colorPicker.scss';

export const DEFAULT_SWATCHES = [
  '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC',
  '#0693E3', '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF',
];

/**
 * Swatch + hex input picker, a drop-in replacement for react-color's
 * TwitterPicker. Works with the app's `{r, g, b, a}` color objects.
 *
 * - onChange(rgb)  fires on every change (swatch click or typing a hex)
 * - onSelect(rgb)  fires when the user picks a swatch, i.e. a "final" choice
 */
export default function ColorPicker({ color, swatches = DEFAULT_SWATCHES, onChange, onSelect }) {
  const hex = color ? rgbObj2HexStr(color) : '#FFFFFF';

  const emit = (nextHex, final) => {
    const rgb = { ...hexStr2RgbObj(nextHex.toUpperCase()), a: color?.a ?? 1 };
    onChange?.(rgb);
    if (final) onSelect?.(rgb);
  };

  return (
    <div className="color-picker" role="dialog" aria-label="Pick a color">
      <div className="color-picker-swatches">
        {swatches.map((swatch) => (
          <button
            type="button"
            key={swatch}
            className={`color-picker-swatch ${swatch.toUpperCase() === hex ? 'active' : ''}`}
            style={{ backgroundColor: swatch }}
            title={swatch}
            aria-label={swatch}
            onClick={() => emit(swatch, true)}
          />
        ))}
      </div>
      <div className="color-picker-input">
        <span className="color-picker-hash">#</span>
        <HexColorInput
          color={hex}
          onChange={(value) => emit(value, false)}
          aria-label="Hex color"
        />
      </div>
    </div>
  );
}

ColorPicker.propTypes = {
  color: PropTypes.shape({
    r: PropTypes.number,
    g: PropTypes.number,
    b: PropTypes.number,
    a: PropTypes.number,
  }),
  swatches: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func,
  onSelect: PropTypes.func,
};
