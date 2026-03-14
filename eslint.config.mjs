import nextVitals from "eslint-config-next/core-web-vitals";
import prettierConfig from "eslint-config-prettier";
import tailwindcss from "eslint-plugin-tailwindcss";

const tightenedTypeCheckFiles = [
  "auth.ts",
  "lib/auth/**/*.ts",
  "lib/api/**/*.ts",
  "lib/db.ts",
  "lib/dto/system-config.ts",
  "lib/email/**/*.ts",
  "lib/files/**/*.ts",
  "lib/short-urls/**/*.ts",
  "lib/umami.ts",
  "lib/utils.ts",
  "app/api/admin/**/*.ts",
  "app/api/domain/**/*.ts",
  "app/api/email/**/*.ts",
  "app/api/keys/**/*.ts",
  "app/api/setup/**/*.ts",
  "app/api/url/**/*.ts",
  "app/api/storage/**/*.ts",
  "app/api/user/**/*.ts",
  "app/api/v1/email/**/*.ts",
  "app/api/v1/email-catcher/**/*.ts",
  "app/api/v1/icon/**/*.ts",
  "app/(protected)/admin/system/app-configs.tsx",
  "app/(protected)/dashboard/urls/export.tsx",
  "app/(protected)/dashboard/urls/globe/**/*.tsx",
  "app/(protected)/dashboard/urls/meta-chart.tsx",
  "app/(protected)/dashboard/urls/world-map.tsx",
  "app/(standalone)/password-prompt/card.tsx",
  "app/(standalone)/emails/**/*.tsx",
  "components/email/**/*.tsx",
  "components/forms/user-auth-form.tsx",
  "components/layout/notification.tsx",
  "components/shared/pagination.tsx",
  "components/shared/tiptap/tiptap-node/image-upload-node/image-upload-node-extension.ts",
  "components/shared/tiptap/tiptap-ui-primitive/tooltip/tooltip.tsx",
];

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
  {
    files: tightenedTypeCheckFiles,
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["app/(protected)/admin/system/**/*.tsx"],
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },
];

export default config;
