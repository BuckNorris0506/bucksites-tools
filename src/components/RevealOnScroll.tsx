"use client";

import {
  createElement,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  rootMargin?: string;
  as?: ElementType;
} & HTMLAttributes<HTMLElement>;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function RevealOnScroll({
  children,
  className = "",
  delayMs = 0,
  rootMargin = "0px 0px -6% 0px",
  as: Tag = "div",
  style,
  ...rest
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  const stagger = Math.min(Math.max(delayMs, 0), 400);
  const mergedStyle = {
    ...style,
    ...(stagger > 0 && visible ? { transitionDelay: `${stagger}ms` } : {}),
  };

  const classes = ["bp-reveal", visible ? "bp-reveal--visible" : "", className]
    .filter(Boolean)
    .join(" ");

  return createElement(
    Tag,
    {
      ...rest,
      ref,
      className: classes,
      style: mergedStyle,
    },
    children,
  );
}
