import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateJoinCode, normalizeJoinCode, suggestUsername } from "./join-code";

describe("join codes", () => {
  it("generates 6 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode(randomInt);
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("normalizes whatever the student types", () => {
    expect(normalizeJoinCode("pingo-k4q9mz")).toBe("K4Q9MZ");
    expect(normalizeJoinCode(" K4Q 9MZ ")).toBe("K4Q9MZ");
    expect(normalizeJoinCode("PINGO K4Q9MZ")).toBe("K4Q9MZ");
    expect(normalizeJoinCode("k4q9mz")).toBe("K4Q9MZ");
  });

  it("suggests a username from the name", () => {
    expect(suggestUsername("Ana Júlia Souza")).toBe("ana.julia");
    expect(suggestUsername("  João  ")).toBe("joao");
  });
});
