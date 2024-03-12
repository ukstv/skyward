import { union, literal, type, string, Type, type Context, type Codec } from "codeco";
import { type CacheHeader, Field } from "o1js";
import { digestToField, fieldToDigest } from "./field-digest.js";

export const fieldAsBase64url = new Type<Field, string, string>(
  "Field-as-Base64url",
  (input: unknown): input is Field => input instanceof Field,
  (input: string, context: Context) => {
    try {
      return context.success(digestToField(input));
    } catch (e) {
      return context.failure(String(e));
    }
  },
  (field: Field) => fieldToDigest(field),
);

export const urlAsString = new Type<URL, string, string>(
  "URL-as-string",
  (input: unknown): input is URL => input instanceof URL,
  (input: string, context: Context) => {
    try {
      return context.success(new URL(input));
    } catch (e) {
      return context.failure(String(e));
    }
  },
  (url) => url.href,
);

export type FileType = CacheHeader["dataType"];
export const dataTypeCodec: Codec<FileType> = union([literal("string"), literal("bytes")]);

export const verificationKeyCodec = type({
  data: string,
  hash: fieldAsBase64url,
});

export const dateString = new Type<Date, string, unknown>(
  "Date-as-ISOString",
  (input: unknown): input is Date => input instanceof Date,
  function (this: Type<Date>, input: unknown, context: Context) {
    if (this.is(input)) return context.success(input);
    if (typeof input === "string") {
      const parsed = new Date(input);
      const isParsingSuccessful = Number.isFinite(parsed.valueOf());
      if (isParsingSuccessful) return context.success(parsed);
    }
    return context.failure();
  },
  (input: Date) => input.toISOString(),
);
