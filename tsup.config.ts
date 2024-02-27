import { defineConfig } from "tsup";

export default defineConfig({
  dts: true,
  format: "cjs",
  inject: ["./react-import.js"],
});
