-- Truth-first launch: remove web-search placeholder rows from live retailer inventory.
-- Real store URLs should be added via import or ops workflows — not Google/Bing search URLs.

delete from public.retailer_links
where retailer_key in ('google-search', 'bing-search');

delete from public.air_purifier_retailer_links
where retailer_key in ('google-search', 'bing-search');

delete from public.whole_house_water_retailer_links
where retailer_key in ('google-search', 'bing-search');
