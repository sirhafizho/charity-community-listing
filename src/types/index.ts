export type DateLike = Date | string;

export type UserRole = "USER" | "ADMIN";
export type ListingStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ListingUrgency = "NORMAL" | "URGENT" | "EXPIRING";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: DateLike;
  updatedAt: DateLike;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  createdAt: DateLike;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  image?: string | null;
  location: string;
  status: ListingStatus;
  urgency: ListingUrgency;
  expiresAt?: DateLike | null;
  createdAt: DateLike;
  updatedAt: DateLike;
  userId: string;
  categoryId: string;
  category?: Category;
  user?: Pick<User, "id" | "name" | "email">;
  claims?: Claim[];
  tags?: Tag[];
}

export interface Claim {
  id: string;
  message?: string | null;
  status: ClaimStatus;
  createdAt: DateLike;
  updatedAt: DateLike;
  listingId: string;
  userId: string;
  listing?: Listing;
  user?: Pick<User, "id" | "name" | "email">;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: DateLike;
  userId: string;
}

export interface CreateListingFormValues {
  title: string;
  description: string;
  categoryId: string;
  location: string;
  urgency?: ListingUrgency;
  expiresAt?: DateLike | null;
  image?: string;
  tags?: string[];
}

export type UpdateListingFormValues = Partial<CreateListingFormValues>;

export interface CreateUserFormValues {
  name: string;
  email: string;
  password: string;
}

export interface LoginUserFormValues {
  email: string;
  password: string;
}

export interface CreateClaimFormValues {
  listingId: string;
  message?: string;
}

export interface UpdateClaimStatusFormValues {
  status: ClaimStatus;
}

export interface CreateCategoryFormValues {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateListingStatusFormValues {
  status: Exclude<ListingStatus, "PENDING">;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ListingCardData {
  id: string;
  title: string;
  image?: string | null;
  location: string;
  status: ListingStatus;
  urgency: ListingUrgency;
  expiresAt?: DateLike | null;
  category?: Pick<Category, "id" | "name"> | null;
  tags?: Array<{ id: string; name: string }>;
  user?: Pick<User, "id" | "name"> | null;
}

export interface AdminListing extends ListingCardData {
  createdAt: string;
  user?: Pick<User, "id" | "name" | "email">;
}

export interface AdminClaim {
  id: string;
  status: ClaimStatus;
  message?: string | null;
  createdAt: string;
  listing: Pick<Listing, "id" | "title" | "location">;
  user: Pick<User, "id" | "name" | "email">;
}
