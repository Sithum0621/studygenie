import { PNG } from "pngjs";

function wipeWatermarkAndInk(png: PNG) {
  const { data } = png;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const yellow =
      lum > 130 && r > 150 && g > 110 && b < 170 && r - b > 35 && g - b > 15;
    if (yellow) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
}

function slicePng(png: PNG, y0: number, y1: number) {
  const width = png.width;
  const height = Math.max(1, y1 - y0);
  const slice = new PNG({ width, height });
  const row = width * 4;
  png.data.copy?.(slice.data, 0, y0 * row, y1 * row);
  if (!png.data.copy) {
    slice.data.set(png.data.subarray(y0 * row, y1 * row));
  }
  return new Uint8Array(PNG.sync.write(slice));
}

export function preparePaperPng(bytes: Uint8Array, parts = 3) {
  try {
    if (bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
    const png = PNG.sync.read(Buffer.from(bytes));
    wipeWatermarkAndInk(png);
    const overlap = Math.floor(png.height * 0.08);
    const bands: Uint8Array[] = [];
    for (let i = 0; i < parts; i += 1) {
      const y0 = Math.max(0, Math.floor((i / parts) * png.height) - (i ? overlap : 0));
      const y1 = Math.min(
        png.height,
        Math.ceil(((i + 1) / parts) * png.height) + (i < parts - 1 ? overlap : 0),
      );
      bands.push(slicePng(png, y0, y1));
    }
    return {
      full: new Uint8Array(PNG.sync.write(png)),
      bands,
    };
  } catch {
    return null;
  }
}
