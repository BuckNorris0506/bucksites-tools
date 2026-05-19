/**
 * Command Center v1 wrapper for vertical launch policy (read-only repo-derived truth).
 */

import {
  attachOwnerVerticalLaunchPolicyReport,
  buildOwnerVerticalLaunchPolicyReport,
  type OwnerVerticalLaunchPolicyReport,
  type OwnerVerticalLaunchPolicyRow,
} from "@/lib/owner-dashboard/owner-vertical-launch-policy";

export type { OwnerVerticalLaunchPolicyReport, OwnerVerticalLaunchPolicyRow };

export { attachOwnerVerticalLaunchPolicyReport, buildOwnerVerticalLaunchPolicyReport };

export type OwnerVerticalLaunchPolicyV1 = OwnerVerticalLaunchPolicyReport & {
  contract: "owner_vertical_launch_policy_v1";
  read_only: true;
};

export function buildOwnerVerticalLaunchPolicyV1(): OwnerVerticalLaunchPolicyV1 {
  const core = buildOwnerVerticalLaunchPolicyReport();
  return {
    contract: "owner_vertical_launch_policy_v1",
    read_only: true,
    data_mutation: core.data_mutation,
    generated_from: core.generated_from,
    rows: core.rows,
  };
}
