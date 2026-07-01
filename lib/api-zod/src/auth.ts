/**
 * Auth Zod schemas.
 *
 * These are exported alongside the codegen output (`./generated/api`) so
 * the rest of the workspace can import them from `@workspace/api-zod`
 * without waiting for the OpenAPI regen.
 */
import * as zod from "zod";

export const SignupBody = zod.object({
  email: zod.string().email().max(254),
  password: zod
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: zod.string().min(1).max(120).optional(),
});

export const LoginBody = zod.object({
  email: zod.string().email().max(254),
  password: zod.string().min(1).max(128),
});

export const PublicUser = zod.object({
  id: zod.number().int().positive(),
  email: zod.string().email(),
  name: zod.string().nullable(),
  createdAt: zod.string(),
});

export const AuthResponse = zod.object({
  user: PublicUser,
});

export const AuthErrorResponse = zod.object({
  error: zod.string(),
});

export type SignupBodyT = zod.infer<typeof SignupBody>;
export type LoginBodyT = zod.infer<typeof LoginBody>;
export type PublicUserT = zod.infer<typeof PublicUser>;
export type AuthResponseT = zod.infer<typeof AuthResponse>;
