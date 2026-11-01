import { describe, expect, it } from "vitest";

import { friendlyMessage } from "./errors";

describe("friendlyMessage", () => {
  it("explains a share total that does not match", () => {
    expect(
      friendlyMessage("The shares add up to 90.00 but the amount is 100.00"),
    ).toBe("The shares do not add up to the total");
  });

  it("explains access to a group the user does not belong to", () => {
    expect(friendlyMessage("Group not found")).toBe(
      "Not a member of this group",
    );
  });

  it("names the people who are not members", () => {
    expect(friendlyMessage("Not a member of this group: dan")).toBe(
      "dan is not a member of this group",
    );
    expect(friendlyMessage("The payer is not a member of this group")).toBe(
      "The payer is not a member of this group",
    );
  });

  it("explains who may delete an expense", () => {
    expect(friendlyMessage("Only the payer can delete this expense")).toBe(
      "Only the person who paid can delete this expense",
    );
  });

  it("explains invalid amounts", () => {
    expect(friendlyMessage("Amount must have at most 2 decimal places")).toBe(
      "Amounts can have at most 2 decimal places",
    );
    expect(friendlyMessage("Amount must be greater than zero")).toBe(
      "The amount must be more than zero",
    );
  });

  it("falls back to a generic message for form validation errors", () => {
    expect(friendlyMessage("description: Field required", "validation_error")).toBe(
      "Please check the form and try again",
    );
  });

  it("keeps messages it does not recognise", () => {
    expect(friendlyMessage("Something odd happened")).toBe(
      "Something odd happened",
    );
  });
});