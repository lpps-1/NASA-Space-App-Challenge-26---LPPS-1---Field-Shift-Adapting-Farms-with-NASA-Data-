// Run: node scripts/test-profile.mjs
// Checks farmer identity rules against the real data client (src/api/kisanClient.js)
// with an in-memory localStorage: display name ≠ email, initials, persistence across
// refresh and sign-out/sign-in, per-account isolation, district changes.
import assert from "node:assert/strict";
import { register } from "node:module";

register("./lib/alias-loader.mjs", import.meta.url);

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  key: (i) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
};
// Object.keys(localStorage) is used by reset(); expose the stored keys.
globalThis.localStorage = new Proxy(globalThis.localStorage, {
  ownKeys: () => [...store.keys()],
  getOwnPropertyDescriptor: (_, k) => (store.has(k) ? { enumerable: true, configurable: true, value: store.get(k) } : undefined),
});

const { kisan } = await import("../src/api/kisanClient.js");
const { initialsOf, displayNameOf } = await import("../src/lib/profile.js");
const { locationPatch } = await (async () => {
  // LocationPicker is JSX; copy of its pure helper's contract for the district test.
  return {
    locationPatch: (d, tehsil = null) => ({
      province: d.province, province_id: d.province_id, division: d.division, division_id: d.division_id,
      district: d.name, district_id: d.id, tehsil, lat: d.lat, lng: d.lng,
    }),
  };
})();

const EMAIL = "sheheryaarhaider79@gmail.com";
const signIn = (id, email) => kisan.setActiveUser({ id, email });

let fail = 0;
const t = async (name, fn) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    fail++;
    console.log(`✗ ${name}\n   ${e.message}`);
  }
};

await t("New account: no name is invented from the email", async () => {
  signIn("u_a", EMAIL);
  const p = await kisan.entities.FarmerProfile.get();
  assert.equal(p.display_name, "");
  assert.equal(p.email, EMAIL);
  assert.equal(p.user_id, "u_a");
  assert.notEqual(p.display_name, "sheheryaarhaider79");
});

await t("Changing the name to Muhammad Aslam sets initials MA and keeps the email", async () => {
  const p = await kisan.entities.FarmerProfile.update({ display_name: "Muhammad Aslam" });
  assert.equal(p.display_name, "Muhammad Aslam");
  assert.equal(p.avatar_initials, "MA");
  assert.equal(p.email, EMAIL);
});

await t("Profile edits cannot overwrite email or user_id", async () => {
  const p = await kisan.entities.FarmerProfile.update({ email: "hacker@x.com", user_id: "other" });
  assert.equal(p.email, EMAIL);
  assert.equal(p.user_id, "u_a");
});

await t("Name survives a page refresh (fresh client, same storage)", async () => {
  const { kisan: fresh } = await import(`../src/api/kisanClient.js?r=${Math.random()}`);
  fresh.setActiveUser({ id: "u_a", email: EMAIL });
  const p = await fresh.entities.FarmerProfile.get();
  assert.equal(p.display_name, "Muhammad Aslam");
});

await t("Name survives sign-out and sign-in", async () => {
  signIn(null);
  signIn("u_a", EMAIL);
  assert.equal((await kisan.entities.FarmerProfile.get()).display_name, "Muhammad Aslam");
});

await t("Another account on the same device has its own name", async () => {
  signIn("u_b", "farmer2@example.pk");
  const p = await kisan.entities.FarmerProfile.get();
  assert.equal(p.display_name, "");
  await kisan.entities.FarmerProfile.update({ display_name: "Rana Tariq" });
  signIn("u_a", EMAIL);
  assert.equal((await kisan.entities.FarmerProfile.get()).display_name, "Muhammad Aslam");
});

await t("Changing district keeps name and email; changing name keeps district", async () => {
  signIn("u_a", EMAIL);
  const multan = { id: "punjab/multan", name: "Multan", province: "Punjab", province_id: "punjab", division: "Multan", division_id: "punjab:multan", lat: 30.19, lng: 71.47 };
  let p = await kisan.entities.FarmerProfile.update(locationPatch(multan));
  assert.equal(p.district_id, "punjab/multan");
  assert.equal(p.display_name, "Muhammad Aslam");
  assert.equal(p.email, EMAIL);
  p = await kisan.entities.FarmerProfile.update({ display_name: "Muhammad Aslam Khan" });
  assert.equal(p.district_id, "punjab/multan");
  assert.equal(p.avatar_initials, "MK");
  await kisan.entities.FarmerProfile.update({ display_name: "Muhammad Aslam" });
});

await t("Reset demo data keeps the farmer's name", async () => {
  kisan.reset();
  const p = await kisan.entities.FarmerProfile.get();
  assert.equal(p.display_name, "Muhammad Aslam");
  assert.equal(p.email, EMAIL);
});

await t("Initials helper", () => {
  assert.equal(initialsOf("Muhammad Aslam"), "MA");
  assert.equal(initialsOf("  aslam  "), "A");
  assert.equal(initialsOf(""), "K");
  assert.equal(initialsOf("محمد اسلم"), "م ا");
  assert.equal(displayNameOf({ full_name: "Old Name" }), "Old Name");
});

if (fail) {
  console.log(`\n${fail} profile check(s) failed`);
  process.exit(1);
}
console.log("\nAll profile checks passed");
