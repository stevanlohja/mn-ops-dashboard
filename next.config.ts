import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import path from "node:path";

// basePath is set in CI for the GitHub Pages project subpath
// (e.g. "/mn-ops-dashboard") and left empty for local dev so the app
// still works at http://localhost:3000/.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export", // static HTML export to out/ for GitHub Pages
  basePath,
  trailingSlash: true, // emit out/<route>/index.html — Pages-friendly routing
  images: { unoptimized: true }, // required by export if next/image is ever used
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
};

// Remark plugins are passed as string paths (not imports): Next 16 defaults to
// Turbopack, which can't serialise function references in loader options. The
// @next/mdx loader resolves these paths itself (see node_modules/@next/mdx).
//   - remark-gfm:       GFM tables / task lists / autolinks
//   - remark-directive: parse `:::note[Title]` containers (produced by sync-docs)
//   - remark-admonition: render those directives as styled admonition blocks
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [
      "remark-gfm",
      "remark-directive",
      path.join(process.cwd(), "plugins", "remark-admonition.mjs"),
    ],
  },
});

export default withMDX(nextConfig);
