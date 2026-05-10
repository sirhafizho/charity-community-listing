import { redirect } from "next/navigation";

import CreateListingForm from "@/components/forms/CreateListingForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CreateListingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/listings/create");
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Share a donation</h1>
        <p className="text-slate-600 dark:text-slate-300">
          Create a listing for an item you would like to donate to a local charity or community group.
        </p>
      </div>
      <CreateListingForm categories={categories} />
    </div>
  );
}
