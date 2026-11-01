/**
 * Turn an error message from the backend into plain language for the user.
 * Messages we do not recognise are shown as they are.
 */
export function friendlyMessage(raw: string, code?: string): string {
  const text = raw.trim();

  if (code === "validation_error") {
    return "Please check the form and try again";
  }

  const notMembers = /^Not a member of this group: (.+)$/.exec(text);
  if (notMembers) {
    return `${notMembers[1]} is not a member of this group`;
  }
  if (/payer is not a member/i.test(text)) {
    return "The payer is not a member of this group";
  }
  if (/^Group not found$/i.test(text)) {
    return "Not a member of this group";
  }
  if (/shares add up to/i.test(text)) {
    return "The shares do not add up to the total";
  }
  if (/only the payer/i.test(text)) {
    return "Only the person who paid can delete this expense";
  }
  if (/^Expense not found$/i.test(text)) {
    return "This expense no longer exists";
  }
  if (/decimal places/i.test(text)) {
    return "Amounts can have at most 2 decimal places";
  }
  if (/greater than zero/i.test(text)) {
    return "The amount must be more than zero";
  }
  if (/too large/i.test(text)) {
    return "That amount is too large";
  }
  if (/missing x-user|unknown user/i.test(text)) {
    return "Please choose a user first";
  }
  return text;
}