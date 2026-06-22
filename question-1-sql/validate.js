// Reproducible check of the Question 1 fix without needing a database server.
// It models the RBAC tables exactly as seeded and resolves each user's effective
// actions through user -> role -> action, then applies solution.sql and re-resolves.
//
//   node validate.js
//
// Exits non-zero if the post-fix state does not match the expected behavior.

const user = [[1, 'Ariel'], [2, 'Taylor'], [3, 'Luka']];
const action = {
  1: 'create bills', 2: 'create products', 3: 'view bills',
  4: 'view products', 5: 'modify products', 6: 'delete products',
};
// user_role_rela: [id, user_id, role_id]
let userRole = [[1, 1, 1], [2, 2, 2], [3, 2, 3], [4, 3, 2], [5, 3, 3], [6, 3, 4]];
// role_action_rela: [id, role_id, action_id]
const roleAction = [[1, 1, 1], [2, 1, 3], [3, 2, 4], [4, 3, 2], [5, 3, 6], [6, 4, 5]];

const effective = () => {
  const out = {};
  for (const [id] of user) out[id] = new Set();
  for (const [, uid, rid] of userRole)
    for (const [, rOfA, aid] of roleAction)
      if (rOfA === rid) out[uid].add(action[aid]);
  return out;
};

const dump = (tag) => {
  const e = effective();
  console.log(`\n=== ${tag} ===`);
  for (const [id, name] of user)
    console.log(name.padEnd(7), '->', [...e[id]].sort().join(', ') || '(none)');
  return e;
};

dump('BEFORE FIX');

// solution.sql: UPDATE user_role_rela SET role_id = 4 WHERE user_id = 2 AND role_id = 3;
userRole = userRole.map((r) => (r[1] === 2 && r[2] === 3 ? [r[0], 2, 4] : r));

const after = dump('AFTER FIX');
const taylor = after[2];
const expected =
  taylor.has('view products') &&
  taylor.has('modify products') &&
  !taylor.has('create products') &&
  !taylor.has('delete products');

console.log('\nTaylor can see + modify products, no inventory change:', expected);
if (!expected) {
  console.error('FAIL: post-fix state does not match the expected behavior');
  process.exit(1);
}
console.log('PASS');
