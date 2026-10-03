/** Divighost has five members; roles may repeat (the workbook permits multiple Captains). */
export const DIVISION_SLOTS = ["member1", "member2", "member3", "member4", "member5"];
export const divisionBranchId = slot => `divighost-${slot}`;

export function selectedDivisionRoles(division, members) {
  return division ? DIVISION_SLOTS.map(slot => members?.[slot] ?? "")
    .filter(role => Object.hasOwn(division.roles, role)) : [];
}
