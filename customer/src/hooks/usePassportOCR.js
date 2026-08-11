"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { track } from "@/lib/telemetry";
import { buildFieldStatuses, mapOcrToTraveler } from "@/config/passportFieldMap";

function errorMessage(err) {
  const detail = err?.response?.data?.detail;
  if (detail && typeof detail === "object" && detail.message) return detail.message;
  if (typeof detail === "string") return detail;
  return "Couldn't read this passport. Please fill fields manually.";
}

/**
 * Upload / scan passport → structured OCR result.
 * Aborts in-flight request on unmount.
 */
export function usePassportOCR() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fieldStatuses, setFieldStatuses] = useState({});
  const abortRef = useRef(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
    setResult(null);
    setError(null);
    setFieldStatuses({});
  }, []);

  const scan = useCallback(async (file) => {
    if (!file) return null;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api.post("/documents/scan-passport", form, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal,
        // Cold start can download OCR models; keep above OCR_REQUEST_TIMEOUT_SEC.
        timeout: 180000,
      });
      const data = r.data;
      setResult(data);
      setFieldStatuses(buildFieldStatuses(data));
      const filled = ["full_name", "passport_number", "date_of_birth", "passport_expiry_date"].filter((k) => data[k]).length;
      track("passport_scan_success", { fields: filled });
      return data;
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return null;
      track("passport_scan_failed");
      const msg = errorMessage(err);
      setError(msg);
      throw Object.assign(new Error(msg), { cause: err });
    } finally {
      setLoading(false);
    }
  }, []);

  return { scan, result, loading, error, fieldStatuses, setFieldStatuses, reset, mapOcrToTraveler };
}
