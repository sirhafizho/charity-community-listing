import { describe, expect, it } from "@jest/globals";

import {
  adminListingModerationSchema,
  createCategorySchema,
  createClaimSchema,
  createListingSchema,
  createUserSchema,
  loginUserSchema,
  updateClaimStatusSchema,
  updateListingSchema,
  updateListingStatusSchema,
} from "@/lib/validations";

describe("validation schemas", () => {
  it("validates user registration payloads", () => {
    expect(
      createUserSchema.parse({
        name: "  Jane Doe  ",
        email: "  jane@example.com  ",
        password: "super-secret",
      }),
    ).toEqual({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "super-secret",
    });

    const invalidUser = createUserSchema.safeParse({
      name: "J",
      email: "invalid-email",
      password: "123",
    });

    expect(invalidUser.success).toBe(false);
  });

  it("validates login payloads", () => {
    expect(
      loginUserSchema.parse({
        email: "  jane@example.com  ",
        password: "secret",
      }),
    ).toEqual({
      email: "jane@example.com",
      password: "secret",
    });

    expect(
      loginUserSchema.safeParse({
        email: "jane@example.com",
        password: "",
      }).success,
    ).toBe(false);
  });

  it("validates listing creation payloads including image values", () => {
    expect(
      createListingSchema.parse({
        title: "  Winter Coat  ",
        description: "  A warm winter coat in great condition.  ",
        categoryId: "cat-1",
        location: "  Boston  ",
        image: "  https://example.com/coat.png  ",
      }),
    ).toEqual({
      title: "Winter Coat",
      description: "A warm winter coat in great condition.",
      categoryId: "cat-1",
      location: "Boston",
      image: "https://example.com/coat.png",
    });

    expect(
      createListingSchema.parse({
        title: "Books",
        description: "1234567890",
        categoryId: "cat-1",
        location: "Boston",
      }).description,
    ).toBe("1234567890");

    expect(
      createListingSchema.safeParse({
        title: "AB",
        description: "Too short",
        categoryId: "",
        location: "",
        image: "ftp://example.com/image.png",
      }).success,
    ).toBe(false);
  });

  it("requires at least one field when updating listings", () => {
    expect(
      updateListingSchema.parse({
        title: "  Updated title  ",
        image: "  /uploads/image.png  ",
      }),
    ).toEqual({
      title: "Updated title",
      image: "/uploads/image.png",
    });

    expect(updateListingSchema.safeParse({}).success).toBe(false);
  });

  it("validates claim creation payloads", () => {
    expect(
      createClaimSchema.parse({
        listingId: "listing-1",
        message: "   ",
      }),
    ).toEqual({
      listingId: "listing-1",
      message: undefined,
    });

    expect(createClaimSchema.safeParse({ listingId: "" }).success).toBe(false);
  });

  it("validates category payloads", () => {
    expect(
      createCategorySchema.parse({
        name: "  Food  ",
        description: "  Pantry staples  ",
        icon: "  box  ",
      }),
    ).toEqual({
      name: "Food",
      description: "Pantry staples",
      icon: "box",
    });

    expect(createCategorySchema.safeParse({ name: "F" }).success).toBe(false);
  });

  it("validates claim status updates", () => {
    expect(updateClaimStatusSchema.parse({ status: "APPROVED" })).toEqual({
      status: "APPROVED",
    });
    expect(updateClaimStatusSchema.safeParse({ status: "DONE" }).success).toBe(false);
  });

  it("validates admin listing status updates", () => {
    expect(updateListingStatusSchema.parse({ status: "REJECTED" })).toEqual({
      status: "REJECTED",
    });
    expect(updateListingStatusSchema.safeParse({ status: "PENDING" }).success).toBe(false);

    expect(
      adminListingModerationSchema.parse({
        id: "  listing-1  ",
        status: "APPROVED",
      }),
    ).toEqual({
      id: "listing-1",
      status: "APPROVED",
    });
    expect(adminListingModerationSchema.safeParse({ status: "APPROVED" }).success).toBe(false);
  });
});
