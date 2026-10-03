// T036: every text and traffic-light tone of the theme has AA contrast (≥ 4.5:1) on the background
// and on the card surface (FR-019, research R6). Values are read from src/app/tokens.css.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/tokens.css", "utf8");

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) throw new Error(`--${name} is not a 6-digit hex color in tokens.css`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

describe("theme tokens", () => {
  it("use the dark background of the nexoru-onboarding app", () => {
    expect(token("nx-bg")).toBe("#05060a");
  });

  const backgrounds = ["nx-bg", "nx-surface"];
  const texts = ["nx-text", "nx-text-soft", "nx-text-muted", "nx-violet-text", "tl-verde", "tl-ambar", "tl-rojo", "tl-neutro"];

  for (const text of texts) {
    for (const background of backgrounds) {
      it(`--${text} on --${background} is at least 4.5:1`, () => {
        expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("does not reuse the warning and danger colors of nexoru-onboarding as they are", () => {
    expect(token("tl-ambar").toLowerCase()).not.toBe("#fde68a");
    expect(token("tl-rojo").toLowerCase()).not.toBe("#fecaca");
  });
});
