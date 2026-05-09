import { z } from "zod";

const imageSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z
    .string()
    .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), {
      message: "Image must be a valid URL or local upload path.",
    })
    .optional(),
);

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().max(maxLength).optional(),
  );

export const createListingSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(5000),
  categoryId: z.string().trim().min(1, "Category is required."),
  location: z.string().trim().min(2, "Location is required.").max(120),
  urgency: z.enum(["NORMAL", "URGENT", "EXPIRING"]).optional().default("NORMAL"),
  expiresAt: z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.coerce.date().optional(),
  ),
  image: imageSchema,
});

export const updateListingSchema = createListingSchema
  .partial()
  .extend({
    urgency: z.enum(["NORMAL", "URGENT", "EXPIRING"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  email: z.string().trim().email("A valid email address is required."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(100, "Password must be 100 characters or less."),
});

export const loginUserSchema = z.object({
  email: z.string().trim().email("A valid email address is required."),
  password: z.string().min(1, "Password is required."),
});

export const createClaimSchema = z.object({
  listingId: z.string().trim().min(1, "Listing is required."),
  message: optionalText(500),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(50),
  description: optionalText(200),
  icon: optionalText(50),
});

export const updateClaimStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const updateListingStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
});

export const adminListingModerationSchema = updateListingStatusSchema.extend({
  id: z.string().trim().min(1, "Listing id is required."),
});

export const bulkUpdateListingStatusSchema = z.object({
  ids: z.array(z.string().trim().min(1, "Listing id is required.")).min(1, "At least one listing is required."),
  status: z.enum(["APPROVED", "REJECTED"]),
});
