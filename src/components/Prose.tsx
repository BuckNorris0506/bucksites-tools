/** Plain text / light markdown-ish blocks from CMS; keep readable without a full MD parser. */
export function Prose({ children }: { children: string | null | undefined }) {
  if (!children?.trim()) return null;
  const blocks = children.trim().split(/\n\n+/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-neutral-800 dark:text-neutral-200">
      {blocks.map((block, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {block}
        </p>
      ))}
    </div>
  );
}
