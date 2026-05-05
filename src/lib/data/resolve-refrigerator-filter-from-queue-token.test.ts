import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveRefrigeratorFilterRowFromQueueToken,
  type ResolveRefrigeratorFilterResult,
} from "./resolve-refrigerator-filter-from-queue-token";

type FilterRow = { id: string; slug: string; oem_part_number: string | null };
type AliasRow = { filter_id: string; alias: string };

type Pending = {
  table: string;
  op: "eq" | "ilike" | "in" | "select";
  col?: string;
  val?: unknown;
  limit?: number;
};

/** Minimal PostgREST-style chain for the queries issued by the resolver. */
function createResolverTestDouble(scenario: {
  slugEq: Map<string, FilterRow[]>;
  oemIlike?: Map<string, FilterRow[]>;
  aliasIlike?: Map<string, AliasRow[]>;
  filtersById?: Map<string, FilterRow>;
}) {
  const pending: Pending[] = [];
  let currentTable = "";
  const filters: FilterRow[] = [];

  function finishSelect(): { data: unknown; error: null } {
    let lim = 25;
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const p = pending[i]!;
      if (p.op === "select" && typeof p.limit === "number") {
        lim = p.limit;
        break;
      }
    }
    for (let i = pending.length - 1; i >= 0; i -= 1) {
      const p = pending[i]!;
      if (p.table !== currentTable) continue;
      if (currentTable === "filters") {
        if (p.op === "eq" && p.col === "slug" && typeof p.val === "string") {
          const rows = scenario.slugEq.get(p.val) ?? [];
          return { data: rows.slice(0, lim), error: null };
        }
        if (p.op === "ilike" && p.col === "oem_part_number" && typeof p.val === "string") {
          const rows = scenario.oemIlike?.get(p.val) ?? [];
          return { data: rows.slice(0, lim), error: null };
        }
        if (p.op === "in" && p.col === "id" && Array.isArray(p.val)) {
          const ids = p.val as string[];
          const out: FilterRow[] = [];
          for (const id of ids) {
            const r = scenario.filtersById?.get(id);
            if (r) out.push(r);
          }
          return { data: out.slice(0, lim), error: null };
        }
      }
      if (currentTable === "filter_aliases") {
        if (p.op === "ilike" && p.col === "alias" && typeof p.val === "string") {
          const rows = scenario.aliasIlike?.get(p.val) ?? [];
          return { data: rows.slice(0, lim), error: null };
        }
      }
    }
    return { data: filters, error: null };
  }

  const supabase = {
    from(table: string) {
      currentTable = table;
      const chain = {
        select(cols: string) {
          void cols;
          pending.push({ table, op: "select", col: undefined, val: undefined });
          return chain;
        },
        eq(col: string, val: unknown) {
          pending.push({ table, op: "eq", col, val });
          return chain;
        },
        ilike(col: string, val: string) {
          pending.push({ table, op: "ilike", col, val });
          return chain;
        },
        in(col: string, val: unknown) {
          pending.push({ table, op: "in", col, val });
          return chain;
        },
        limit(n: number) {
          pending.push({ table, op: "select", limit: n, col: undefined, val: undefined });
          return Promise.resolve(finishSelect());
        },
      };
      return chain;
    },
  };

  return { supabase: supabase as import("@supabase/supabase-js").SupabaseClient, pending };
}

test("EDR1RXD1 resolves via lowercase slug after exact slug miss", async () => {
  const row: FilterRow = { id: "81d1c570-24cc-4008-80db-ce21d05a0607", slug: "edr1rxd1", oem_part_number: "EDR1RXD1" };
  const { supabase } = createResolverTestDouble({
    slugEq: new Map([
      ["EDR1RXD1", []],
      ["edr1rxd1", [row]],
    ]),
  });
  const got = await resolveRefrigeratorFilterRowFromQueueToken(supabase, "EDR1RXD1");
  const exp: ResolveRefrigeratorFilterResult = {
    ok: true,
    row: { id: row.id, slug: "edr1rxd1", oem_part_number: "EDR1RXD1" },
    via: "slug_lower",
  };
  assert.deepEqual(got, exp);
});

test("token resolves via OEM when slug lookups miss", async () => {
  const row: FilterRow = { id: "id-oem", slug: "edr2rxd1", oem_part_number: "EDR2RXD1" };
  const { supabase } = createResolverTestDouble({
    slugEq: new Map([
      ["EDR2RXD1", []],
      ["edr2rxd1", []],
    ]),
    oemIlike: new Map([["EDR2RXD1", [row]]]),
  });
  const got = await resolveRefrigeratorFilterRowFromQueueToken(supabase, "EDR2RXD1");
  assert.equal(got.ok, true);
  if (got.ok) {
    assert.equal(got.via, "oem_part_number");
    assert.equal(got.row.slug, "edr2rxd1");
  }
});

test("token resolves via filter_aliases when slug and OEM miss", async () => {
  const row: FilterRow = { id: "id-a", slug: "ukf8001", oem_part_number: "UKF8001" };
  const { supabase } = createResolverTestDouble({
    slugEq: new Map([
      ["UKF8001", []],
      ["ukf8001", []],
    ]),
    oemIlike: new Map([["UKF8001", []]]),
    aliasIlike: new Map([["UKF8001", [{ filter_id: "id-a", alias: "UKF8001" }]]]),
    filtersById: new Map([["id-a", row]]),
  });
  const got = await resolveRefrigeratorFilterRowFromQueueToken(supabase, "UKF8001");
  assert.equal(got.ok, true);
  if (got.ok) assert.equal(got.via, "filter_alias");
});

test("ambiguous OEM matches return ok false", async () => {
  const { supabase } = createResolverTestDouble({
    slugEq: new Map([
      ["X", []],
      ["x", []],
    ]),
    oemIlike: new Map([
      [
        "X",
        [
          { id: "1", slug: "a", oem_part_number: "X" },
          { id: "2", slug: "b", oem_part_number: "X" },
        ],
      ],
    ]),
  });
  const got = await resolveRefrigeratorFilterRowFromQueueToken(supabase, "X");
  assert.equal(got.ok, false);
  if (!got.ok) assert.equal(got.reason, "ambiguous");
});
