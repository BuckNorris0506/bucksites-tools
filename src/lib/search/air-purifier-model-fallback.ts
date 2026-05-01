import { extractModelIntentToken } from "@/lib/search/model-intent-token";
import type { PostgrestError } from "@supabase/supabase-js";

type RpcResultRow = Record<string, unknown>;

type RpcResult = {
  data: RpcResultRow[] | null;
  error: PostgrestError | null;
};

type RpcCaller = (name: string, args: { q: string; limit_count: number }) => Promise<RpcResult>;

export async function fetchAirPurifierModelRowsWithFallback(
  rawQuery: string,
  limitCount: number,
  rpc: RpcCaller,
): Promise<{
  modelsDirect: RpcResult;
  modelAliases: RpcResult;
}> {
  const modelsDirect = await rpc("search_air_purifier_models_flexible", {
    q: rawQuery,
    limit_count: limitCount,
  });
  const modelAliases = await rpc("search_air_purifier_model_aliases_flexible", {
    q: rawQuery,
    limit_count: limitCount,
  });

  const initialModelHits = (modelsDirect.data?.length ?? 0) + (modelAliases.data?.length ?? 0);
  if (initialModelHits > 0) {
    return { modelsDirect, modelAliases };
  }

  const fallbackToken = extractModelIntentToken(rawQuery);
  if (!fallbackToken) {
    return { modelsDirect, modelAliases };
  }

  const fallbackModelsDirect = await rpc("search_air_purifier_models_flexible", {
    q: fallbackToken,
    limit_count: limitCount,
  });
  const fallbackModelAliases = await rpc("search_air_purifier_model_aliases_flexible", {
    q: fallbackToken,
    limit_count: limitCount,
  });

  return {
    modelsDirect: fallbackModelsDirect,
    modelAliases: fallbackModelAliases,
  };
}
