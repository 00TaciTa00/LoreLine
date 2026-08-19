import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { World } from "@/lib/api/types";

export function useWorlds() {
  return useQuery({
    queryKey: ["worlds"],
    queryFn: () => fetchJson<{ worlds: World[] }>("/api/worlds"),
    select: (data) => data.worlds,
  });
}

export function useWorld(worldId: number) {
  return useQuery({
    queryKey: ["worlds", worldId],
    queryFn: () => fetchJson<{ world: World }>(`/api/worlds/${worldId}`),
    select: (data) => data.world,
    enabled: Number.isFinite(worldId),
  });
}

export function useCreateWorld() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      fetchJson<{ world: World }>("/api/worlds", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds"] });
    },
  });
}

export function useUpdateWorld(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name?: string; description?: string }) =>
      fetchJson<{ world: World }>(`/api/worlds/${worldId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds"] });
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId] });
    },
  });
}

export function useDeleteWorld() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (worldId: number) =>
      fetchJson<{ world: World }>(`/api/worlds/${worldId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds"] });
    },
  });
}
