"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useVisaProducts } from "@/hooks/customer-api";
import { POPULAR_DESTINATION_NAMES } from "@/lib/seo";

export default function FooterPopularDestinations() {
  const { data: products } = useVisaProducts();
  const links = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    return POPULAR_DESTINATION_NAMES.map((name) => {
      const match = list.find(
        (p) => p.country_name?.toLowerCase() === name.toLowerCase(),
      );
      return {
        name,
        href: match?.id ? `/visa/${match.id}` : `/?q=${encodeURIComponent(name)}`,
      };
    });
  }, [products]);

  return (
    <ul className="space-y-3">
      {links.map((item) => (
        <li key={item.name}>
          <Link
            href={item.href}
            className="text-[15px] text-ink/80 hover:text-ink transition-colors"
          >
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
