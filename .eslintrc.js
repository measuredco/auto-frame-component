module.exports = {
  root: true,
  extends: ["prettier"],
  rules: {
    "react-hooks/exhaustive-deps": "off",
  },
  parserOptions: {
    babelOptions: {
      presets: [],
    },
  },
};
