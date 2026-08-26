import { describe, expect, it } from "vitest";
import { summariseFees } from "./fees";

/**
 * These tests cover the distinction the whole fees module exists to make:
 * owing money is not the same as being in arrears.
 */

const NOW = new Date("2026-06-01T12:00:00Z");
const past = "2026-05-01";
const future = "2026-09-01";

describe("summariseFees", () => {
  it("reports nothing owing on an empty account", () => {
    const s = summariseFees([], [], NOW);
    expect(s.balance.toFixed(2)).toBe("0.00");
    expect(s.isOverdue).toBe(false);
    expect(s.inCredit).toBe(false);
    expect(s.nextDueDate).toBeNull();
  });

  it("does not treat a future instalment as arrears", () => {
    const s = summariseFees([{ amount: "4625.00", dueDate: future }], [], NOW);
    expect(s.balance.toFixed(2)).toBe("4625.00");
    expect(s.isOverdue).toBe(false);
    expect(s.overdueAmount.toFixed(2)).toBe("0.00");
  });

  it("treats an unpaid charge past its due date as arrears", () => {
    const s = summariseFees([{ amount: "4625.00", dueDate: past }], [], NOW);
    expect(s.isOverdue).toBe(true);
    expect(s.overdueAmount.toFixed(2)).toBe("4625.00");
  });

  it("applies payments to the oldest charge first", () => {
    // £1,200 received against a £4,625 charge that fell due last month and a
    // second one not due until September: only the shortfall on the first is
    // in arrears, and the future instalment is untouched.
    const s = summariseFees(
      [
        { amount: "4625.00", dueDate: past },
        { amount: "4625.00", dueDate: future },
      ],
      [{ amount: "1200.00" }],
      NOW,
    );

    expect(s.balance.toFixed(2)).toBe("8050.00");
    expect(s.overdueAmount.toFixed(2)).toBe("3425.00");
    expect(s.isOverdue).toBe(true);
  });

  it("clears arrears once the overdue charge is fully covered", () => {
    const s = summariseFees(
      [
        { amount: "4625.00", dueDate: past },
        { amount: "4625.00", dueDate: future },
      ],
      [{ amount: "4625.00" }],
      NOW,
    );

    expect(s.balance.toFixed(2)).toBe("4625.00"); // still owes the future one
    expect(s.isOverdue).toBe(false);
    expect(s.overdueAmount.toFixed(2)).toBe("0.00");
  });

  it("reports an overpayment as credit rather than a negative debt", () => {
    const s = summariseFees(
      [{ amount: "12500.00", dueDate: past }],
      [{ amount: "12800.00" }],
      NOW,
    );

    expect(s.inCredit).toBe(true);
    expect(s.balance.toFixed(2)).toBe("-300.00");
    expect(s.isOverdue).toBe(false);
  });

  it("points at the earliest unpaid charge as the next thing due", () => {
    const s = summariseFees(
      [
        { amount: "100.00", dueDate: "2026-07-01" },
        { amount: "100.00", dueDate: "2026-06-15" },
      ],
      [],
      NOW,
    );

    expect(s.nextDueDate?.toISOString().slice(0, 10)).toBe("2026-06-15");
  });

  it("keeps pennies exact across many small payments", () => {
    // The reason money is Decimal: summing 0.1 three times as floats gives
    // 0.30000000000000004, and a ledger that cannot balance is unusable.
    const s = summariseFees(
      [{ amount: "0.30", dueDate: past }],
      [{ amount: "0.10" }, { amount: "0.10" }, { amount: "0.10" }],
      NOW,
    );

    expect(s.balance.toFixed(2)).toBe("0.00");
    expect(s.isOverdue).toBe(false);
  });
});
