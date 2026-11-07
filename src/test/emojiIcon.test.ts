import { describe, expect, it } from "vitest";
import { DEVICON_LIST, EMOJI_LIST, firstEmoji, isEmojiIcon } from "@/lib/types";

describe("isEmojiIcon", () => {
  it("accepts emoji, including sequences and flags", () => {
    for (const icon of ["🧪", "⚗️", "👩‍💻", "🇧🇷", ...EMOJI_LIST]) {
      expect(isEmojiIcon(icon)).toBe(true);
    }
  });

  it("rejects every icon name", () => {
    for (const icon of DEVICON_LIST) {
      expect(isEmojiIcon(icon)).toBe(false);
    }
  });
});

describe("firstEmoji", () => {
  it("returns the whole sequence", () => {
    expect(firstEmoji("abc 👩‍💻")).toBe("👩‍💻");
    expect(firstEmoji("🇧🇷")).toBe("🇧🇷");
  });

  it("returns undefined without an emoji", () => {
    expect(firstEmoji("react")).toBeUndefined();
  });
});
