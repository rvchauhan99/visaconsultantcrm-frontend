"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useVisaProducts(params = {}) {
  return useQuery({
    queryKey: queryKeys.visaProducts(params),
    queryFn: async () => {
      const r = await api.get("/visa-products", { params });
      return r.data;
    },
  });
}

export function useVisaProduct(productId) {
  return useQuery({
    queryKey: queryKeys.visaProduct(productId),
    queryFn: async () => {
      const r = await api.get(`/visa-products/${productId}`);
      return r.data;
    },
    enabled: Boolean(productId),
    retry: (count, err) => (err?.response?.status === 404 ? false : count < 1),
  });
}

export function useCustomerMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => (await api.get("/customers/me")).data,
    enabled,
  });
}

export function useUpdateCustomerMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.patch("/customers/me", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => (await api.get("/customers/me/notifications")).data || [],
    enabled,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/customers/me/notifications/mark-all-read", {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useTravelerProfiles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.travelers,
    queryFn: async () => (await api.get("/customers/me/traveler-profiles")).data || [],
    enabled,
  });
}

export function useTravelerProfile(id) {
  return useQuery({
    queryKey: queryKeys.traveler(id),
    queryFn: async () => (await api.get(`/customers/me/traveler-profiles/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useVaultByKey(docKey, enabled = true) {
  return useQuery({
    queryKey: queryKeys.vaultByKey(docKey),
    queryFn: async () => (await api.get(`/customers/me/document-vault/by-key/${docKey}`)).data || [],
    enabled: Boolean(docKey) && enabled,
  });
}

export function useMyCases(enabled = true) {
  return useQuery({
    queryKey: queryKeys.myCases,
    queryFn: async () => (await api.get("/cases/my")).data || [],
    enabled,
  });
}

export function useDrafts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.drafts,
    queryFn: async () => {
      const raw = (await api.get("/cases/drafts")).data || [];
      const enriched = await Promise.all(
        raw.map(async (d) => {
          try {
            const p = await api.get(`/visa-products/${d.visa_product_id}`);
            return { ...d, product: p.data };
          } catch {
            return { ...d, product: null };
          }
        }),
      );
      return enriched.filter((d) => d.product);
    },
    enabled,
  });
}

export function useDraft(draftId) {
  return useQuery({
    queryKey: queryKeys.draft(draftId),
    queryFn: async () => (await api.get(`/cases/drafts/${draftId}`)).data,
    enabled: Boolean(draftId),
  });
}

export function useCaseStatus(caseId, { poll = true } = {}) {
  return useQuery({
    queryKey: queryKeys.caseStatus(caseId),
    queryFn: async () => (await api.get(`/cases/${caseId}/status`)).data,
    enabled: Boolean(caseId),
    refetchInterval: poll ? 15_000 : false,
  });
}
