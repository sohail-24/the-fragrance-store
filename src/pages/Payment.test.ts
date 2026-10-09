import { describe, it, expect } from "vitest";

describe("Payment page identifier formatting & privacy", () => {
  function deriveTicketIdentifier(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    const lastFour = digits.length >= 4 ? digits.slice(-4) : "----";
    return `T ${lastFour}`;
  }

  it("formats US phone numbers with +1 into T + last 4 digits correctly", () => {
    expect(deriveTicketIdentifier("+1 9849815743")).toBe("T 5743");
    expect(deriveTicketIdentifier("+19849815743")).toBe("T 5743");
    expect(deriveTicketIdentifier("+1 (984) 981-5743")).toBe("T 5743");
  });

  it("formats standard 10-digit US phone numbers into T + last 4 digits correctly", () => {
    expect(deriveTicketIdentifier("9849815743")).toBe("T 5743");
    expect(deriveTicketIdentifier("2125552390")).toBe("T 2390");
    expect(deriveTicketIdentifier("4155559239")).toBe("T 9239");
    expect(deriveTicketIdentifier("6505551574")).toBe("T 1574");
  });

  it("ensures privacy: does not expose full phone number or country code in the ticket identifier", () => {
    const rawInput = "+1 9849815743";
    const result = deriveTicketIdentifier(rawInput);

    expect(result).toBe("T 5743");
    expect(result).not.toContain("+1");
    expect(result).not.toContain("984");
    expect(result).not.toContain("981");
    expect(result.length).toBe(6); // 'T' + ' ' + 4 digits = 6 chars
  });
});
