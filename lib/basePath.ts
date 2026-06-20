/**
 * Public base path for the deployment. Set via NEXT_PUBLIC_BASE_PATH at build
 * time (e.g. "/mn-ops-dashboard" for the GitHub Pages project subpath); empty
 * for local dev. Used to prefix raw asset URLs in <img> tags, which Next does
 * NOT rewrite automatically the way it does for <Link>/next/image.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
