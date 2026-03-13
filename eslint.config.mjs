import nextVitals from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier";
import tailwindcss from "eslint-plugin-tailwindcss";

const config = [
  ...nextVitals,
  ...tailwindcss.configs["flat/recommended"],
  prettierConfig,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    settings: {
      next: {
        rootDir: true,
      },
      tailwindcss: {
        callees: ["cn"],
        config: "tailwind.config.ts",
      },
    },
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/jsx-key": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/use-memo": "off",
      "tailwindcss/classnames-order": "off",
      "tailwindcss/enforces-shorthand": "off",
      "tailwindcss/migration-from-tailwind-2": "off",
      "tailwindcss/no-custom-classname": "off",
    },
  },
];

export default config;
