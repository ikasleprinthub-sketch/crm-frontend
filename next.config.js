/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode is kept ON (default). Duplicate effect calls in development
  // are handled by the isFetchingRef guard in AppContext.fetchInitialData.
  reactStrictMode: true,
};

module.exports = nextConfig;
