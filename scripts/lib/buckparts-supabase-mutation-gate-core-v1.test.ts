import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSupabaseMutationAuthorizedV1,
  buildSupabaseMutationGatePreflightV1,
  IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1,
  resolveIoCapabilityFromEnvV1,
  SupabaseMutationGateBlockedError,
  supabaseMutationAuthorizedV1,
} from "./buckparts-supabase-mutation-gate-core-v1";

test("dry_run never authorizes Supabase writes", () => {
  const preflight = buildSupabaseMutationGatePreflightV1({
    mode: "dry_run",
    io_capability: "MUTATION",
  });
  assert.equal(preflight.mutation_authorized, false);
  assert.equal(preflight.blockers.length, 0);
  assert.equal(supabaseMutationAuthorizedV1(preflight), false);
  assert.doesNotThrow(() => assertSupabaseMutationAuthorizedV1(preflight));
});

test("write with READ_INDEX fails closed", () => {
  const preflight = buildSupabaseMutationGatePreflightV1({
    mode: "write",
    io_capability: "READ_INDEX",
  });
  assert.equal(preflight.mutation_authorized, false);
  assert.ok(preflight.blockers.includes(IO_CAPABILITY_READ_INDEX_CANNOT_MUTATE_SUPABASE_V1));
  assert.throws(
    () => assertSupabaseMutationAuthorizedV1(preflight),
    SupabaseMutationGateBlockedError,
  );
});

test("write with MUTATION authorizes without extra blockers", () => {
  const preflight = buildSupabaseMutationGatePreflightV1({
    mode: "write",
    io_capability: "MUTATION",
  });
  assert.equal(preflight.mutation_authorized, true);
  assert.equal(supabaseMutationAuthorizedV1(preflight), true);
  assert.doesNotThrow(() => assertSupabaseMutationAuthorizedV1(preflight));
});

test("resolveIoCapabilityFromEnvV1 defaults to READ_INDEX", () => {
  const previous = process.env.BUCKPARTS_IO_CAPABILITY;
  delete process.env.BUCKPARTS_IO_CAPABILITY;
  try {
    assert.equal(resolveIoCapabilityFromEnvV1(), "READ_INDEX");
    process.env.BUCKPARTS_IO_CAPABILITY = "MUTATION";
    assert.equal(resolveIoCapabilityFromEnvV1(), "MUTATION");
  } finally {
    if (previous === undefined) delete process.env.BUCKPARTS_IO_CAPABILITY;
    else process.env.BUCKPARTS_IO_CAPABILITY = previous;
  }
});
