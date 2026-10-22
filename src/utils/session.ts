const USER_STORAGE_KEY = "nova-art-user";

/** Stable ownership scope for the browser-backed mock across refreshes. */
export function getSessionOwnerId(): string {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(USER_STORAGE_KEY) ?? "null",
    );
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof value.id === "string" &&
      value.id.length > 0
    ) {
      return value.id;
    }
  } catch {
    // Treat malformed local demo identity as anonymous.
  }

  return "anonymous";
}
