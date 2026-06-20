"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DocNode, isSection } from "@/lib/docs/manifest";

function slugToHref(slug: string) {
  return slug ? `/docs/${slug}` : "/docs";
}

function NavTree({ nodes, depth = 0 }: { nodes: DocNode[]; depth?: number }) {
  const pathname = usePathname();

  return (
    <ul className={depth === 0 ? "flex flex-col gap-5" : "flex flex-col gap-0.5 mt-1"}>
      {nodes.map((node, i) => {
        if (isSection(node)) {
          return (
            <li key={`${node.title}-${i}`}>
              <div
                className={
                  depth === 0
                    ? "text-[11px] font-semibold uppercase tracking-wider text-mn-muted mb-1.5"
                    : "text-xs font-medium text-mn-text-2 mt-2 mb-0.5 pl-2"
                }
              >
                {node.title}
              </div>
              <div className={depth === 0 ? "" : "border-l border-mn-border ml-2"}>
                <NavTree nodes={node.children} depth={depth + 1} />
              </div>
            </li>
          );
        }

        const href = slugToHref(node.slug);
        const active = pathname === href;
        return (
          <li key={node.slug}>
            <Link
              href={href}
              className={`block rounded-md px-2 py-1 text-sm transition-colors ${
                active
                  ? "bg-mn-surface-2 text-mn-text font-medium"
                  : "text-mn-muted hover:text-mn-text hover:bg-mn-surface-2"
              }`}
            >
              {node.title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function DocsSidebar({ nodes }: { nodes: DocNode[] }) {
  return (
    <nav className="text-sm" aria-label="Documentation">
      <NavTree nodes={nodes} />
    </nav>
  );
}
