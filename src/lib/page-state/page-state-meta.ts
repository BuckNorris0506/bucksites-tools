import { PAGE_STATES, type PageState } from "@/lib/page-state/page-state";

type RobotsIndexFollow = {
  index: boolean;
  follow: true;
};

export function getRobotsFromPageState(pageState: PageState): RobotsIndexFollow {
  if (
    pageState === PAGE_STATES.INDEXABLE_BUY_READY ||
    pageState === PAGE_STATES.INDEXABLE_BUY_SUPPRESSED_TRUST ||
    pageState === PAGE_STATES.INDEXABLE_INFO_ONLY
  ) {
    return { index: true, follow: true };
  }

  return { index: false, follow: true };
}
