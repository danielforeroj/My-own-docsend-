"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/spaces", label: "Spaces" },
  { href: "/admin/share-links", label: "Share Links" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-xl px-3 py-2 text-sm transition ${
              active
                ? "bg-[color:var(--primary)] text-white"
                : "text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
