"use client";

import { RecentSearches } from "@/components/RecentSearches";
import { SearchForm } from "@/components/SearchForm";
import { NumberHelpDisclosure } from "@/components/homepage/NumberHelpDisclosure";
import {
  HOME_INPUT_LABEL,
  HOME_LOOKUP_INPUT_ID,
  HOME_PLACEHOLDER_DESKTOP,
  HOME_PLACEHOLDER_MOBILE,
  HOME_PRIMARY_CTA,
  HOME_TRUST_LINE,
  HOME_VALIDATION_MESSAGE,
} from "@/lib/homepage/homepage-copy";

export function HomeLookup() {
  return (
    <div className="flex flex-col gap-4">
      <SearchForm
        inputId={HOME_LOOKUP_INPUT_ID}
        label={HOME_INPUT_LABEL}
        labelVisible
        placeholder={HOME_PLACEHOLDER_MOBILE}
        placeholderDesktop={HOME_PLACEHOLDER_DESKTOP}
        submitLabel={HOME_PRIMARY_CTA}
        stackedUntilLg
        describedBy={`${HOME_LOOKUP_INPUT_ID}-example`}
        validationMessage={HOME_VALIDATION_MESSAGE}
        formClassName="flex w-full flex-col gap-2"
        inputClassName="bp-home__input flex-1"
        buttonClassName="bp-home__cta w-full lg:w-auto"
      />
      <p id={`${HOME_LOOKUP_INPUT_ID}-example`} className="bp-home__meta">
        Example filter number: <span className="bp-code">DA29-00020B</span>.
      </p>
      <NumberHelpDisclosure lookupInputId={HOME_LOOKUP_INPUT_ID} />
      <p className="text-base font-semibold text-bp-text">{HOME_TRUST_LINE}</p>
      <RecentSearches actionPath="/search" />
    </div>
  );
}
