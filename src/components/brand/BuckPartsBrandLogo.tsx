import Image from "next/image";
import Link from "next/link";
import {
  BUCKPARTS_HORIZONTAL_LOGO_HEIGHT,
  BUCKPARTS_HORIZONTAL_LOGO_PATH,
  BUCKPARTS_HORIZONTAL_LOGO_WIDTH,
  BUCKPARTS_ICON_LOGO_PATH,
  BUCKPARTS_ICON_LOGO_SIZE,
} from "@/lib/brand/buckparts-brand-assets-v1";
import { SITE_DISPLAY_NAME } from "@/lib/site-brand";

type Props = {
  variant?: "horizontal" | "icon";
  priority?: boolean;
  className?: string;
};

/** Shared production header logo — founder-approved PNG only; no legacy inline mark. */
export function BuckPartsBrandLogo({
  variant = "horizontal",
  priority = false,
  className,
}: Props) {
  if (variant === "icon") {
    return (
      <Image
        src={BUCKPARTS_ICON_LOGO_PATH}
        alt=""
        width={BUCKPARTS_ICON_LOGO_SIZE}
        height={BUCKPARTS_ICON_LOGO_SIZE}
        priority={priority}
        unoptimized
        className={className}
      />
    );
  }

  return (
    <Image
      src={BUCKPARTS_HORIZONTAL_LOGO_PATH}
      alt=""
      width={BUCKPARTS_HORIZONTAL_LOGO_WIDTH}
      height={BUCKPARTS_HORIZONTAL_LOGO_HEIGHT}
      priority={priority}
      unoptimized
      className={className}
    />
  );
}

export function BuckPartsBrandHomeLink({
  priority = false,
  className,
}: {
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={className} aria-label={`${SITE_DISPLAY_NAME} home`}>
      <BuckPartsBrandLogo priority={priority} className="bp-brand-logo__img" />
    </Link>
  );
}
