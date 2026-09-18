import { hslToRgb, rgbToHsl, rgbObj2HexStr, hexStr2RgbObj } from './utils';

describe('hslToRgb', () => {
  test('achromatic (s = 0) yields equal channels', () => {
    expect(hslToRgb(0, 0, 0.5)).toEqual([128, 128, 128]);
    expect(hslToRgb(0.3, 0, 1)).toEqual([255, 255, 255]);
    expect(hslToRgb(0.7, 0, 0)).toEqual([0, 0, 0]);
  });

  test('primary hues', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
    expect(hslToRgb(1 / 3, 1, 0.5)).toEqual([0, 255, 0]);
    expect(hslToRgb(2 / 3, 1, 0.5)).toEqual([0, 0, 255]);
  });
});

describe('rgbToHsl', () => {
  test('achromatic colors have zero hue and saturation', () => {
    expect(rgbToHsl(128, 128, 128)).toEqual([0, 0, 128 / 255]);
    expect(rgbToHsl(0, 0, 0)).toEqual([0, 0, 0]);
  });

  test('primary colors', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 1, 0.5]);
    expect(rgbToHsl(0, 255, 0)).toEqual([1 / 3, 1, 0.5]);
    expect(rgbToHsl(0, 0, 255)).toEqual([2 / 3, 1, 0.5]);
  });

  test('round-trips through hslToRgb', () => {
    const samples = [[12, 200, 77], [255, 128, 0], [10, 10, 250]];
    for (const [r, g, b] of samples) {
      expect(hslToRgb(...rgbToHsl(r, g, b))).toEqual([r, g, b]);
    }
  });
});

describe('rgbObj2HexStr', () => {
  test('formats to upper-case, zero-padded hex', () => {
    expect(rgbObj2HexStr({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbObj2HexStr({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    expect(rgbObj2HexStr({ r: 1, g: 171, b: 15 })).toBe('#01AB0F');
  });

  test('throws when a channel is out of range', () => {
    expect(() => rgbObj2HexStr({ r: 256, g: 0, b: 0 })).toThrow(/RGB color range/);
    expect(() => rgbObj2HexStr({ r: 0, g: -1, b: 0 })).toThrow(/RGB color range/);
  });
});

describe('hexStr2RgbObj', () => {
  test('parses 6-digit hex with alpha defaulting to 1', () => {
    expect(hexStr2RgbObj('#01AB0F')).toEqual({ r: 1, g: 171, b: 15, a: 1 });
  });

  test('parses 8-digit hex including alpha', () => {
    expect(hexStr2RgbObj('#FF000080')).toEqual({ r: 255, g: 0, b: 0, a: 128 });
  });

  test('is the inverse of rgbObj2HexStr', () => {
    const rgb = { r: 12, g: 200, b: 77 };
    expect(hexStr2RgbObj(rgbObj2HexStr(rgb))).toEqual({ ...rgb, a: 1 });
  });
});
