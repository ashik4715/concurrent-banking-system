import nextConfig from "eslint-config-next";

const config = [
  ...nextConfig,
  {
    rules: {
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@next/next/no-img-element": "warn",
    },
  },
  {
    ignores: ["playwright-report/**", "test-results/**"],
  },
];

export default config;
