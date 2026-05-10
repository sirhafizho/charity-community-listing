export type DateLike = Date | string;

export type UserRole = "USER" | "ADMIN";
export type ListingStatus = "PENDING" | "APPROVED" | "REJECTED" | "CLAIMED" | "FULFILLED";
export type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED" | "FULFILLED";
export type ListingUrgency = "NORMAL" | "URGENT" | "EXPIRING";
export type ListingCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
export type ReportReason = "SPAM" | "INAPPROPRIATE" | "SCAM" | "OTHER";
export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED";

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
  condition: ListingCondition;
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
  pickupAt?: DateLike | null;
  createdAt: DateLike;
  updatedAt: DateLike;
  listingId: string;
  userId: string;
  listing?: Listing;
  user?: Pick<User, "id" | "name" | "email">;
  messages?: ClaimMessage[];
  gratitudeNote?: GratitudeNote | null;
}

export interface ClaimMessage {
  id: string;
  content: string;
  createdAt: DateLike;
  claimId: string;
  userId: string;
  user?: Pick<User, "id" | "name">;
}

export interface GratitudeNote {
  id: string;
  content: string;
  createdAt: DateLike;
  claimId: string;
  userId: string;
  user?: Pick<User, "id" | "name">;
}

export interface Report {
  id: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  createdAt: DateLike;
  listingId: string;
  userId: string;
  listing?: Pick<Listing, "id" | "title">;
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
  condition?: ListingCondition;
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
  pickupAt?: string;
}

export interface CreateClaimMessageFormValues {
  content: string;
}

export interface CreateGratitudeNoteFormValues {
  content: string;
}

export interface CreateReportFormValues {
  reason: ReportReason;
  details?: string;
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
  condition: ListingCondition;
  status: ListingStatus;
  urgency: ListingUrgency;
  expiresAt?: DateLike | null;
  createdAt: DateLike;
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

export interface ImpactStats {
  itemsDonated: number;
  peoplHelped: number;
  daysActive: number;
  itemsClaimed: number;
  fulfilledClaims: number;
}

export interface DonorBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}
