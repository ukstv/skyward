import { initContract } from "@ts-rest/core";
import * as z from "zod";

const contract = initContract();

export const JWTTokenPayload = z.object({
  id: z.string(),
  exp: z.number().transform((n) => new Date(n * 1000)),
});

export const ErrorResponseSchema = z.object({
  message: z.string(),
});

export const SessionSchema = z.object({
  email: z.string(),
  id: z.string(),
  token: z.string(),
  exp: z.number(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const PolicySchema = z.object({
  url: z.string(),
  fields: z.object({
    key: z.string(),
    "x-goog-date": z.string(),
    "x-goog-credential": z.string(),
    "x-goog-algorithm": z.string(),
    policy: z.string(),
    "x-goog-signature": z.string(),
  }),
});

export const UploadResponseSchema = z.object({
  policy: PolicySchema,
});

export const BucketsSchema = contract.router(
  {
    upload: {
      method: "POST",
      path: "/",
      headers: z.object({
        authorization: z.string(),
      }),
      responses: {
        200: UploadResponseSchema,
        403: ErrorResponseSchema,
      },
      body: z.object({
        filename: z.string(),
      }),
    },
  },
  { pathPrefix: "/buckets" },
);

export const UsersSchema = contract.router(
  {
    add: {
      method: "POST",
      path: "/",
      responses: {
        201: SessionSchema,
        400: ErrorResponseSchema,
      },
      body: LoginSchema,
    },
    token: {
      method: "POST",
      path: "/token",
      body: LoginSchema,
      responses: {
        400: ErrorResponseSchema,
        200: SessionSchema,
      },
    },
    buckets: contract.router(BucketsSchema, { pathPrefix: "/:id" }),
  } as const,
  { pathPrefix: "/users" },
);

export const HttpSchema = contract.router({
  users: UsersSchema,
} as const);
export type HttpSchema = typeof HttpSchema;
