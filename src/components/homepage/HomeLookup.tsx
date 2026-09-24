"use client";

import { SearchForm } from "@/components/SearchForm";
import { NumberHelpDisclosure } from "@/components/homepage/NumberHelpDisclosure";
import {
  HOME_EXAMPLE_MODEL,
  HOME_EXAMPLE_PART,
  HOME_INPUT_LABEL,
  HOME_LOOKUP_INPUT_ID,
  HOME_PLACEHOLDER,
  HOME_PRIMARY_CTA,
  HOME_VALIDATION_MESSAGE,
} from "@/lib/homepage/homepage-copy";

export function HomeLookup() {
  return (
    <div className="bp-home__lookup-block">
      <SearchForm
        inputId={HOME_LOOKUP_INPUT_ID}
        label={HOME_INPUT_LABEL}
        labelVisible
        placeholder={HOME_PLACEHOLDER}
        submitLabel={HOME_PRIMARY_CTA}
        stackedUntilLg={false}
        showSearchIcon
        submitTrailingIcon
        describedBy={`${HOME_LOOKUP_INPUT_ID}-example`}
        validationMessage={HOME_VALIDATION_MESSAGE}
        formClassName="bp-home__lookup-form"
        inputClassName="bp-home__lookup-input"
        buttonClassName="bp-home__primary-button"
        searchRowClassName="bp-home__search-row"
        inputWrapClassName="bp-home__input-wrap"
      />
      <p id={`${HOME_LOOKUP_INPUT_ID}-example`} className="bp-home__example-hint">
        For example, <code>{HOME_EXAMPLE_MODEL}</code> or <code>{HOME_EXAMPLE_PART}</code>.
      </p>
      <NumberHelpDisclosure lookupInputId={HOME_LOOKUP_INPUT_ID} />
    </div>
  );
}
