import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemas";
import { estrutura } from "./structure";

export default defineConfig({
  name: "planetaflix",
  title: "Planeta Flix — Editorial",
  projectId: "sku1yl2b",
  dataset: "production",
  plugins: [structureTool({ structure: estrutura }), visionTool()],
  schema: { types: schemaTypes },
});
