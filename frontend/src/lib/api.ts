import type {
  ApiErrorBody,
  NextCartRecommendation,
  NutritionSnapshot,
  Profile,
  ProfileCreate,
  ReceiptDetailResponse,
  ReceiptItemUpdate,
  UploadReceiptResponse,
} from "@/types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body: ApiErrorBody = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

// --- Epic 1: Receipts -------------------------------------------------

export function uploadReceiptFile(file: File): Promise<UploadReceiptResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return fetch(`${API_BASE}/receipts`, { method: "POST", body: formData }).then((res) => handle<UploadReceiptResponse>(res));
}

export function uploadReceiptText(text: string): Promise<UploadReceiptResponse> {
  const formData = new FormData();
  formData.append("text", text);
  return fetch(`${API_BASE}/receipts`, { method: "POST", body: formData }).then((res) => handle<UploadReceiptResponse>(res));
}

export function getReceipt(receiptId: string): Promise<ReceiptDetailResponse> {
  return fetch(`${API_BASE}/receipts/${receiptId}`).then((res) => handle<ReceiptDetailResponse>(res));
}

export function updateReceiptItem(
  receiptId: string,
  itemId: string,
  updates: ReceiptItemUpdate,
): Promise<{ receipt_id: string; item_id: string; updated: ReceiptItemUpdate }> {
  return fetch(`${API_BASE}/receipts/${receiptId}/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  }).then((res) =>
    handle<{ receipt_id: string; item_id: string; updated: ReceiptItemUpdate }>(res),
  );
}

// --- Epic 3: Profile ----------------------------------------------------

export function createProfile(profile: ProfileCreate): Promise<Profile> {
  return fetch(`${API_BASE}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  }).then((res) => handle<Profile>(res));
}

// --- Epic 4: Nutrition snapshot ------------------------------------------

export function getNutritionSnapshot(): Promise<NutritionSnapshot> {
  return fetch(`${API_BASE}/nutrition/snapshot`).then((res) => handle<NutritionSnapshot>(res));
}

// --- Epic 5: Next Cart ----------------------------------------------------

export function getNextCart(profileId?: string): Promise<NextCartRecommendation> {
  const query = profileId ? `?profile_id=${encodeURIComponent(profileId)}` : "";
  return fetch(`${API_BASE}/next-cart${query}`).then((res) =>
    handle<NextCartRecommendation>(res),
  );
}
