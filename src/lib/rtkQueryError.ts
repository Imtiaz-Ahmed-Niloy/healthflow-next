import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

export interface ParsedApiError {
  message: string;
  fieldErrors: Record<string, string>;
}

type BackendErrorPayload = {
  message?: unknown;
  error?: unknown;
  errors?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isFetchBaseQueryError = (error: unknown): error is FetchBaseQueryError =>
  isRecord(error) && "status" in error && "data" in error;

const isSerializedError = (error: unknown): error is SerializedError =>
  isRecord(error) && ("message" in error || "name" in error || "stack" in error);

const toMessage = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return null;
};

const contains = (text: string, terms: string[]) =>
  terms.some((term) => text.toLowerCase().includes(term));

const mapFriendlyMessage = (source: string, status?: number | string): string => {
  const normalized = source.toLowerCase();

  if (contains(normalized, ["email"]) && contains(normalized, ["duplicate", "already", "exist", "taken"])) {
    return "This email is already registered.";
  }

  if (contains(normalized, ["phone", "mobile"]) && contains(normalized, ["duplicate", "already", "exist", "taken"])) {
    return "This phone number is already registered.";
  }

  if (contains(normalized, ["future", "date of birth", "dob"])) {
    return "Please enter a valid date of birth.";
  }

  if (contains(normalized, ["network", "failed to fetch"])) {
    return "Network error. Please check your connection and try again.";
  }

  if (status === "FETCH_ERROR") {
    return "Network error. Please check your connection and try again.";
  }

  if (status === 409) {
    return "That account already exists. Please use a different email or phone number.";
  }

  if (status === 400 || status === 422) {
    return "Please check the form and try again.";
  }

  if (status === 500) {
    return "Server error. Please try again later.";
  }

  return "Signup failed. Please try again.";
};

const extractFieldErrors = (errors: unknown): Record<string, string> => {
  if (!isRecord(errors)) {
    return {};
  }

  return Object.entries(errors).reduce<Record<string, string>>((acc, [field, value]) => {
    const message = Array.isArray(value)
      ? toMessage(value[0])
      : toMessage(value);

    if (message) {
      acc[field] = message;
    }

    return acc;
  }, {});
};

export const parseApiError = (error: unknown): ParsedApiError => {
  if (isFetchBaseQueryError(error)) {
    const payload = isRecord(error.data) ? (error.data as BackendErrorPayload) : undefined;
    const status = error.status;
    const fieldErrors = extractFieldErrors(payload?.errors);

    const message = toMessage(payload?.message) ?? toMessage(payload?.error);
    if (message) {
      return {
        message: mapFriendlyMessage(message, status),
        fieldErrors,
      };
    }

    return {
      message: mapFriendlyMessage("", status),
      fieldErrors,
    };
  }

  if (isSerializedError(error)) {
    const message = toMessage(error.message);

    return {
      message: mapFriendlyMessage(message ?? "", undefined),
      fieldErrors: {},
    };
  }

  if (isRecord(error)) {
    const payload = error as BackendErrorPayload;
    const fieldErrors = extractFieldErrors(payload.errors);
    const message = toMessage(payload.message) ?? toMessage(payload.error);

    return {
      message: mapFriendlyMessage(message ?? "", undefined),
      fieldErrors,
    };
  }

  return {
    message: "Signup failed. Please try again.",
    fieldErrors: {},
  };
};
