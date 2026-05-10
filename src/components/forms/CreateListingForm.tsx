"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ApiResponse, Category, Listing, ListingUrgency } from "@/types";

type CreateListingFormProps = {
  categories: Pick<Category, "id" | "name">[];
};

type ValidationDetails = {
  fieldErrors?: Partial<Record<string, string[] | undefined>>;
  formErrors?: string[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const listingFieldNames = ["title", "description", "categoryId", "location", "urgency", "expiresAt", "image"] as const;
const urgencyOptions: Array<{ description: string; label: string; value: ListingUrgency }> = [
  { value: "NORMAL", label: "Normal", description: "Standard pickup timeline" },
  { value: "URGENT", label: "Urgent", description: "Needs pickup today" },
  { value: "EXPIRING", label: "Expiring soon", description: "Available for a limited time" },
];

type ListingFieldName = (typeof listingFieldNames)[number];
type ListingFieldErrors = Partial<Record<ListingFieldName, string[]>>;

function inputClassName(hasError: boolean, extraClassName = "") {
  return [
    "w-full rounded-2xl border px-4 py-3 outline-none transition dark:bg-slate-800 dark:border-slate-600 dark:text-white",
    hasError
      ? "border-rose-300 focus:border-rose-500 dark:border-rose-500"
      : "border-slate-200 focus:border-emerald-500",
    extraClassName,
  ]
    .filter(Boolean)
    .join(" ");
}

function isValidationDetails(value: unknown): value is ValidationDetails {
  return typeof value === "object" && value !== null;
}

function extractFieldErrors(details: ValidationDetails | null): ListingFieldErrors {
  const nextErrors: ListingFieldErrors = {};

  if (!details?.fieldErrors) {
    return nextErrors;
  }

  for (const field of listingFieldNames) {
    const messages = details.fieldErrors[field];

    if (!Array.isArray(messages)) {
      continue;
    }

    const filteredMessages = messages.filter((message): message is string => Boolean(message?.trim()));

    if (filteredMessages.length > 0) {
      nextErrors[field] = filteredMessages;
    }
  }

  return nextErrors;
}

function FieldErrorList({ messages, id }: { messages?: string[]; id?: string }) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <ul id={id} className="space-y-1 text-sm text-rose-600 dark:text-rose-300">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

export default function CreateListingForm({ categories }: CreateListingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState<ListingUrgency>("NORMAL");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formMessages, setFormMessages] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ListingFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minimumExpiryDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const clearFieldError = (field: ListingFieldName) => {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const resetValidationState = () => {
    setFormMessages([]);
    setFieldErrors({});
  };

  const setValidationState = (messages: string[], errors: ListingFieldErrors = {}) => {
    setFormMessages(messages);
    setFieldErrors(errors);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      clearFieldError("image");
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationState(["Please review the highlighted fields."], {
        image: ["Please choose a JPG, PNG, GIF, or WebP image."],
      });
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setValidationState(["Please review the highlighted fields."], {
        image: ["Image size must be 5MB or smaller."],
      });
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFormMessages([]);
    clearFieldError("image");
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadImage = async () => {
    if (!selectedFile) {
      return undefined;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as ApiResponse<{ url: string }>;

    if (!response.ok || !result.success) {
      throw new Error(result.success ? "Image upload failed." : result.error);
    }

    return result.data.url;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (categories.length === 0) {
      setValidationState(["Create a category before submitting a listing."]);
      return;
    }

    resetValidationState();
    setIsSubmitting(true);

    try {
      const image = await uploadImage();
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          categoryId,
          location,
          urgency,
          expiresAt: urgency === "EXPIRING" && expiresAt ? expiresAt : undefined,
          image,
        }),
      });

      const result = (await response.json()) as ApiResponse<Listing>;

      if (!response.ok || !result.success) {
        if (!result.success) {
          const details = isValidationDetails(result.details) ? result.details : null;
          const nextFieldErrors = extractFieldErrors(details);
          const nextFormMessages = details?.formErrors?.filter((message): message is string =>
            Boolean(message?.trim()),
          );
          const fallbackMessage =
            nextFormMessages && nextFormMessages.length > 0
              ? nextFormMessages[0]
              : Object.keys(nextFieldErrors).length > 0
                ? "Please correct the highlighted fields and try again."
                : result.error || "Unable to submit the listing.";

          setValidationState(
            nextFormMessages && nextFormMessages.length > 0 ? nextFormMessages : [fallbackMessage],
            nextFieldErrors,
          );
          toast.error(fallbackMessage);
          return;
        }

        throw new Error("Unable to submit the listing.");
      }

      toast.success("Your listing is pending admin review.");
      router.push("/dashboard?created=1");
      router.refresh();
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit the listing.";
      setValidationState([message]);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Create a new listing</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Share items with your community. New listings stay pending until an admin reviews them.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFormMessages([]);
              clearFieldError("title");
            }}
            required
            aria-invalid={fieldErrors.title ? "true" : "false"}
            aria-describedby={fieldErrors.title ? "listing-title-error" : undefined}
            className={inputClassName(Boolean(fieldErrors.title))}
            placeholder="Children's story books"
          />
          <FieldErrorList messages={fieldErrors.title} id="listing-title-error" />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Description</span>
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setFormMessages([]);
              clearFieldError("description");
            }}
            required
            rows={6}
            aria-invalid={fieldErrors.description ? "true" : "false"}
            aria-describedby={fieldErrors.description ? "listing-description-error" : undefined}
            className={inputClassName(Boolean(fieldErrors.description))}
            placeholder="Describe the item condition, quantity, and pick-up details."
          />
          <FieldErrorList messages={fieldErrors.description} id="listing-description-error" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setFormMessages([]);
              clearFieldError("categoryId");
            }}
            required
            disabled={categories.length === 0}
            aria-invalid={fieldErrors.categoryId ? "true" : "false"}
            aria-describedby={fieldErrors.categoryId ? "listing-category-error" : undefined}
            className={inputClassName(
              Boolean(fieldErrors.categoryId),
              "disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-700",
            )}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <FieldErrorList messages={fieldErrors.categoryId} id="listing-category-error" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Location</span>
          <input
            value={location}
            onChange={(event) => {
              setLocation(event.target.value);
              setFormMessages([]);
              clearFieldError("location");
            }}
            required
            aria-invalid={fieldErrors.location ? "true" : "false"}
            aria-describedby={fieldErrors.location ? "listing-location-error" : undefined}
            className={inputClassName(Boolean(fieldErrors.location))}
            placeholder="Brooklyn, NY"
          />
          <FieldErrorList messages={fieldErrors.location} id="listing-location-error" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Urgency</span>
          <select
            value={urgency}
            onChange={(event) => {
              const nextUrgency = event.target.value as ListingUrgency;
              setUrgency(nextUrgency);
              setFormMessages([]);
              clearFieldError("urgency");

              if (nextUrgency !== "EXPIRING") {
                setExpiresAt("");
                clearFieldError("expiresAt");
              }
            }}
            aria-invalid={fieldErrors.urgency ? "true" : "false"}
            aria-describedby={fieldErrors.urgency ? "listing-urgency-error" : undefined}
            className={inputClassName(Boolean(fieldErrors.urgency))}
          >
            {urgencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
          <FieldErrorList messages={fieldErrors.urgency} id="listing-urgency-error" />
        </label>

        {urgency === "EXPIRING" ? (
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Expiry date</span>
            <input
              type="date"
              value={expiresAt}
              min={minimumExpiryDate}
              onChange={(event) => {
                setExpiresAt(event.target.value);
                setFormMessages([]);
                clearFieldError("expiresAt");
              }}
              aria-invalid={fieldErrors.expiresAt ? "true" : "false"}
              aria-describedby={fieldErrors.expiresAt ? "listing-expires-at-error" : undefined}
              className={inputClassName(Boolean(fieldErrors.expiresAt))}
            />
            <p className="text-xs text-slate-500 dark:text-slate-300">
              Optional. Let people know when this item will no longer be available.
            </p>
            <FieldErrorList messages={fieldErrors.expiresAt} id="listing-expires-at-error" />
          </label>
        ) : null}

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Image</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileChange}
            aria-invalid={fieldErrors.image ? "true" : "false"}
            aria-describedby={fieldErrors.image ? "listing-image-error" : undefined}
            className="block w-full rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          />
          <p className="text-xs text-slate-500 dark:text-slate-300">Optional. JPG, PNG, GIF, or WebP up to 5MB.</p>
          <FieldErrorList messages={fieldErrors.image} id="listing-image-error" />
        </label>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-200">Image preview</p>
          <Image
            src={previewUrl}
            alt="Preview"
            width={1200}
            height={640}
            unoptimized
            className="h-64 w-full rounded-2xl object-cover"
          />
        </div>
      ) : null}

      {formMessages.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100" role="alert">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {formMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || categories.length === 0}
        className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
      >
        {isSubmitting ? "Submitting..." : "Submit listing"}
      </button>
    </form>
  );
}
