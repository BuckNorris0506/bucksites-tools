import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { fetchAirPurifierModelRowsWithFallback } from "./air-purifier-model-fallback";

type RpcResult = {
  data: Record<string, unknown>[] | null;
  error: { message?: string } | null;
};

function makeRpcStub(
  resolver: (name: string, q: string) => RpcResult,
): {
  rpc: (name: string, args: { q: string; limit_count: number }) => Promise<RpcResult>;
  calls: Array<{ name: string; q: string; limit_count: number }>;
} {
  const calls: Array<{ name: string; q: string; limit_count: number }> = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, q: args.q, limit_count: args.limit_count });
      return resolver(name, args.q);
    },
  };
}

describe("fetchAirPurifierModelRowsWithFallback", () => {
  it("uses fallback token for `levoit lap` and returns LAP-V102S-AASR", async () => {
    const stub = makeRpcStub((name, q) => {
      if (q === "levoit lap") return { data: [], error: null };
      if (q === "lap" && name === "search_air_purifier_models_flexible") {
        return {
          data: [
            {
              slug: "levoit-lap-v102s-aasr",
              model_number: "LAP-V102S-AASR",
              brand_name: "Levoit",
              brand_slug: "levoit",
            },
          ],
          error: null,
        };
      }
      if (q === "lap" && name === "search_air_purifier_model_aliases_flexible") {
        return { data: [], error: null };
      }
      return { data: [], error: null };
    });

    const out = await fetchAirPurifierModelRowsWithFallback("levoit lap", 25, stub.rpc);

    assert.equal(out.modelsDirect.data?.[0]?.model_number, "LAP-V102S-AASR");
    assert.deepEqual(
      stub.calls.map((c) => `${c.name}:${c.q}`),
      [
        "search_air_purifier_models_flexible:levoit lap",
        "search_air_purifier_model_aliases_flexible:levoit lap",
        "search_air_purifier_models_flexible:lap",
        "search_air_purifier_model_aliases_flexible:lap",
      ],
    );
  });

  it("does not fallback for single-token queries", async () => {
    const stub = makeRpcStub(() => ({ data: [], error: null }));
    await fetchAirPurifierModelRowsWithFallback("lap", 25, stub.rpc);
    assert.equal(stub.calls.length, 2);
  });

  it("does not fallback when initial model hits exist", async () => {
    const stub = makeRpcStub((name, q) => {
      if (name === "search_air_purifier_models_flexible" && q === "levoit lap") {
        return {
          data: [{ slug: "levoit-lap-v102s-aasr", model_number: "LAP-V102S-AASR" }],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    await fetchAirPurifierModelRowsWithFallback("levoit lap", 25, stub.rpc);
    assert.equal(stub.calls.length, 2);
  });

  it("does not fallback for generic query with no model-intent token", async () => {
    const stub = makeRpcStub(() => ({ data: [], error: null }));
    await fetchAirPurifierModelRowsWithFallback("levoit filter", 25, stub.rpc);
    assert.equal(stub.calls.length, 2);
  });
});
