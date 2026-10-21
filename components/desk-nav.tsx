"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Overview" },
  { href: "/receive", label: "Take a complaint" },
  { href: "/incidents", label: "Incidents" },
  { href: "/cases", label: "Customer cases" },
  { href: "/queue", label: "Work to do" },
  { href: "/advisories", label: "Customer advisories" },
  { href: "/channels", label: "Channels" },
  { href: "/guide", label: "How it works" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DeskNav() {
  const pathname = usePathname();
  return (
    <nav className="menubar">
      <div className="menu-items">
        {items.map((item) => (
          <Link key={item.href} href={item.href} data-active={isActive(pathname, item.href)}>
            {item.label}
          </Link>
        ))}
      </div>
      <Link className="menu-key" href="/guide">
        Status key → How it works
      </Link>
    </nav>
  );
}
