"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ApiResponse, Category, Listing } from "@/types";

type CreateListingFormProps = {
  categories: Pick<Category, "id" | "name">[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function CreateListingForm({ categories }: CreateListingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [location, setLocation] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image size must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setError(null);
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
      setError("Create a category before submitting a listing.");
      return;
    }

    setError(null);
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
          image,
        }),
      });

      const result = (await response.json()) as ApiResponse<Listing>;

      if (!response.ok || !result.success) {
        throw new Error(result.success ? "Unable to create listing." : result.error);
      }

      toast.success("Listing submitted for review.");
      router.push(`/listings/${result.data.id}`);
      router.refresh();
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to submit the listing.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Create a new listing</h2>
        <p className="mt-2 text-sm text-slate-600">
          Share items with your community. New listings stay pending until an admin reviews them.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            placeholder="Children's story books"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            rows={6}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            placeholder="Describe the item condition, quantity, and pick-up details."
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
            disabled={categories.length === 0}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Location</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-sky-500"
            placeholder="Brooklyn, NY"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Image</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-sky-700"
          />
          <p className="text-xs text-slate-500">Optional. JPG, PNG, GIF, SVG, or WebP up to 5MB.</p>
        </label>
      </div>

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">Image preview</p>
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

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || categories.length === 0}
        className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSubmitting ? "Submitting..." : "Submit listing"}
      </button>
    </form>
  );
}
