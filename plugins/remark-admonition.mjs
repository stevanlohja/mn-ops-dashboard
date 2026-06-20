/**
 * remark-admonition — render remark-directive containers as admonition blocks.
 *
 * The sync step (scripts/sync-docs.mjs) rewrites MkDocs admonitions
 * (`!!! note "Title"`) into directive containers (`:::note[Title]`). This plugin
 * turns those `containerDirective` nodes into:
 *
 *   <div class="admonition admonition-note">
 *     <div class="admonition-title">Title</div>
 *     ...body...
 *   </div>
 *
 * styled in app/globals.css. Inner content is already parsed markdown, so lists,
 * links, and code inside an admonition render normally.
 */

const DEFAULT_TITLES = {
  note: "Note",
  info: "Info",
  tip: "Tip",
  warning: "Warning",
  danger: "Danger",
  success: "Success",
  question: "Question",
  example: "Example",
  quote: "Quote",
  abstract: "Abstract",
  bug: "Bug",
  failure: "Failure",
};

function walk(node, fn) {
  fn(node);
  const kids = node.children;
  if (Array.isArray(kids)) for (const child of kids) walk(child, fn);
}

export default function remarkAdmonition() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== "containerDirective") return;

      const name = node.name;
      node.data = node.data || {};
      node.data.hName = "div";
      node.data.hProperties = {
        className: ["admonition", `admonition-${name}`],
      };

      const children = node.children || [];
      let labelNode = null;
      if (children[0]?.data?.directiveLabel) labelNode = children.shift();

      const titleChildren = labelNode
        ? labelNode.children
        : [
            {
              type: "text",
              value:
                DEFAULT_TITLES[name] ||
                name.charAt(0).toUpperCase() + name.slice(1),
            },
          ];

      const titleEl = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: { className: ["admonition-title"] },
        },
        children: titleChildren,
      };

      node.children = [titleEl, ...children];
    });
  };
}
