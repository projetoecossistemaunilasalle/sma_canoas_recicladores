import { z } from "zod"

// The two Zod shapes every resource's routes.ts re-declares inline for its
// 404/400/etc responses and its :id param — kept here once.
export const errorResponseSchema = z.object({ message: z.string() })
export const idParamSchema = z.object({ id: z.string().uuid() })
