// GitHub Pages serves this repo at /eljawad-motors/ (no custom domain), so the
// Pages workflow sets GITHUB_PAGES=true to build with that subpath. The
// HostGator workflow (deploy-artisbay.yml) never sets this, so it keeps
// building as if at root, unaffected - .htaccess serves that from /artisbay/.
var isGithubPages = process.env.GITHUB_PAGES === 'true';
var basePath = '';
var assetPrefix = '/';

if (isGithubPages) {
  basePath = '/eljawad-motors';
  assetPrefix = '/eljawad-motors/';
}

var nextConfig = {
  output: 'export',
  productionBrowserSourceMaps: false,

  basePath: basePath,
  assetPrefix: assetPrefix,

  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  publicRuntimeConfig: {
    basePath: basePath,
  },
};

export default nextConfig;
