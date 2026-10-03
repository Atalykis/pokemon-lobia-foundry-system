/**
 * The uniform skill-tree topology shared by all 18 type trees.
 * Read top (root) to bottom (terminal). "Split" tiers have two sibling bonus nodes.
 *
 * Node kinds:
 *  - "root"       : the tree entry. Free, auto-unlocked, no cost.
 *  - "competence" : a "Compétence Dresseur" slot. Unlocking lets the trainer learn a new
 *                   skill (tier 1) OR raise an owned skill by one tier, from any of their 4 types.
 *  - "bonus"      : a passive bonus node. `labelSlot` selects the per-type label (see TREE_LABELS).
 *  - "terminal"   : end node. Grants +1 to the trainer's maximum Action ("Action +").
 *
 * `parents` is an OR prerequisite: a node is unlockable if the root, or if ≥1 parent is unlocked.
 * Every non-root node costs 1 skill point.
 */
export const TREE_NODES = [
  { id: "root", kind: "root",       tier: 0, parents: [],              cost: 0 },
  { id: "cd1",  kind: "competence", tier: 1, parents: ["root"],        cost: 1 },
  { id: "b2a",  kind: "bonus",      tier: 2, parents: ["cd1"],         cost: 1, labelSlot: "statA" },
  { id: "b2b",  kind: "bonus",      tier: 2, parents: ["cd1"],         cost: 1, labelSlot: "subRecharge" },
  { id: "cd2",  kind: "competence", tier: 3, parents: ["b2a", "b2b"],  cost: 1 },
  { id: "b4a",  kind: "bonus",      tier: 4, parents: ["cd2"],         cost: 1, labelSlot: "immunite" },
  { id: "b4b",  kind: "bonus",      tier: 4, parents: ["cd2"],         cost: 1, labelSlot: "subConnaissance" },
  { id: "cd3",  kind: "competence", tier: 5, parents: ["b4a", "b4b"],  cost: 1 },
  { id: "b6a",  kind: "bonus",      tier: 6, parents: ["cd3"],         cost: 1, labelSlot: "statB" },
  { id: "b6b",  kind: "bonus",      tier: 6, parents: ["cd3"],         cost: 1, labelSlot: "subMaitre" },
  { id: "term", kind: "terminal",   tier: 7, parents: ["b6a", "b6b"],  cost: 1 }
];

/** Node lookup by id. */
export const TREE_NODES_BY_ID = Object.fromEntries(TREE_NODES.map(n => [n.id, n]));

/** Rows for rendering: each entry is the node ids at that tier (1 or 2 wide). */
export const TREE_ROWS = [
  ["root"],
  ["cd1"],
  ["b2a", "b2b"],
  ["cd2"],
  ["b4a", "b4b"],
  ["cd3"],
  ["b6a", "b6b"],
  ["term"]
];

/**
 * Rows as drawn on a sheet. The root is left out: it carries the type's own name, which
 * the tree already shows as its title. The node itself still exists in TREE_NODES —
 * it is the free, always-unlocked anchor every tier-1 prerequisite points at.
 */
export const TREE_DISPLAY_ROWS = TREE_ROWS.filter(
  row => row.some(id => TREE_NODES_BY_ID[id].kind !== "root")
);
