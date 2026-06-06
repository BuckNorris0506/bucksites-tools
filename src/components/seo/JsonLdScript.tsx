import type { JsonLdObject } from "@/lib/seo/structured-data";

type Props = {
  data: JsonLdObject | JsonLdObject[];
};

export function JsonLdScript({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
