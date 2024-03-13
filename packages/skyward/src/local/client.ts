import { initClient } from "@ts-rest/core";
import { HttpSchema } from "./http-schema.js";

export const CLIENT = initClient(HttpSchema, {
  baseUrl: "https://api.skyward.run/",
  baseHeaders: {},
});
