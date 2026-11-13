// react-scripts 5 has no hook for Tailwind v4's PostCSS plugin. "file" mode makes CRA use
// postcss.config.js as is, in place of its own plugin list (postcss-preset-env would rewrite
// the @layer rules Tailwind v4 depends on).

// react-scripts 5 calls APIs that Node and webpack-dev-server have deprecated, and it will not be
// updated.
process.noDeprecation = true;

module.exports = {
  style: {
    postcss: { mode: "file" },
  },
  webpack: {
    configure: (config) => {
      // Packages that ship a source map reference without the map only flood the output
      config.ignoreWarnings = [...(config.ignoreWarnings ?? []), /Failed to parse source map/];
      return config;
    },
  },
};
