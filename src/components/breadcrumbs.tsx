import { ChevronRight } from "lucide-react";
import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items, label }: { items: BreadcrumbItem[]; label: string }) {
  return (
    <nav aria-label={label} className="mb-8 text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li className="flex min-w-0 items-center gap-1.5" key={`${item.label}-${index}`}>
            {index > 0 ? <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : null}
            {item.href ? (
              <Link className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
