import type { MDXComponents } from "mdx/types";
import { isValidElement } from "react";
import Mermaid from "@/components/docs/Mermaid";

/**
 * Mermaid fenced blocks (```mermaid) compile to <pre><code class="language-mermaid">.
 * We intercept <pre>, and when its <code> child is mermaid, render the diagram
 * instead. Everything else falls through to the default element (styled by the
 * `.prose-runbook` CSS used on doc/runbook articles).
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    pre: (props) => {
      const child = props.children;
      if (isValidElement(child)) {
        const childProps = child.props as {
          className?: string;
          children?: unknown;
        };
        if (childProps.className?.includes("language-mermaid")) {
          return <Mermaid chart={String(childProps.children).trim()} />;
        }
      }
      return <pre {...props} />;
    },
  };
}
