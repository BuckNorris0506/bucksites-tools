import {
  FRIDGE_HOMEOWNER_WHERE_TO_LOOK_BODY,
  FRIDGE_HOMEOWNER_WHERE_TO_LOOK_MANUAL,
} from "@/lib/copy/fridge-homeowner-help";
import { COMPARE_BEFORE_BUY_CHECKLIST_LINES } from "@/lib/copy/public-trust";

/** Reused from content/help/how-to-find-refrigerator-model-number.md */
export const NUMBER_HELP_APPLIANCE_INTRO =
  "You need the full model number (not the serial number) to look up the right water filter.";

export const NUMBER_HELP_APPLIANCE_PLACES = [
  {
    title: "Inside the fridge",
    body: "Open the fresh food compartment. On many units the tag is on a side wall, ceiling, or behind a drawer frame. Use good light; the stamp can be small.",
  },
  {
    title: "On the door frame",
    body: "Some models put the rating plate on the frame that the door closes against (often the upper hinge side).",
  },
  {
    title: "Behind the kick plate",
    body: "If you do not see a tag inside, check the toe grille or kick panel at the bottom front. It may snap or unscrew off.",
  },
  {
    title: "Paperwork",
    body: "The same model number usually appears on your purchase documents or on the manufacturer’s product registration.",
  },
] as const;

export const NUMBER_HELP_WRITE_DOWN = [
  "Copy the model exactly as printed (letters, numbers, and dashes).",
  "Do not confuse it with the serial number; filters are matched to the model.",
] as const;

export const NUMBER_HELP_WORN_TAG =
  "Use any legible fragment and your brand name, or check the manual PDF on the manufacturer’s support site using the serial number—they often list the model there.";

export const NUMBER_HELP_VARIATION_NOTE =
  "Exact label location varies by brand and year. Your owner’s manual’s “finding model number” section is the definitive guide for your unit.";

export const NUMBER_HELP_GENERIC_LOCATION = FRIDGE_HOMEOWNER_WHERE_TO_LOOK_BODY;
export const NUMBER_HELP_GENERIC_MANUAL = FRIDGE_HOMEOWNER_WHERE_TO_LOOK_MANUAL;

export const NUMBER_HELP_OLD_FILTER_LINES = [
  "Find the number on your old filter.",
  COMPARE_BEFORE_BUY_CHECKLIST_LINES[0],
  "Compare this number to the one printed on your old filter.",
] as const;

export const NUMBER_HELP_AP_GAP =
  "Air purifier label diagrams are not in this help yet. Use the model sticker on the unit or the number printed on the old filter, then compare it with your owner’s manual.";
