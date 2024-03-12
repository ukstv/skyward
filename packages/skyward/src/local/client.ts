import { initClient } from "@ts-rest/core";
import { HttpSchema } from "./http-schema.js";

export const CLIENT = initClient(HttpSchema, {
  baseUrl: "https://skyward-api-rbmp3gpe7q-ez.a.run.app/",
  baseHeaders: {},
});
