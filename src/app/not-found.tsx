import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Page not found
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        That slug does not match anything in the catalog.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-neutral-900 underline dark:text-neutral-100"
      >
        Back to search
      </Link>
    </div>
  );
}
