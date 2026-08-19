import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { EventSummary, Place } from "@/lib/api/types";

export function usePlaces(worldId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "places"],
    queryFn: () =>
      fetchJson<{ places: Place[] }>(`/api/worlds/${worldId}/places`),
    select: (data) => data.places,
    enabled: Number.isFinite(worldId),
  });
}

export function usePlace(worldId: number, placeId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "places", placeId],
    queryFn: () =>
      fetchJson<{ place: Place; events: EventSummary[] }>(
        `/api/worlds/${worldId}/places/${placeId}`,
      ),
    enabled: Number.isFinite(worldId) && Number.isFinite(placeId),
  });
}

type PlaceInput = { name: string; description?: string; color?: string };

export function useCreatePlace(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceInput) =>
      fetchJson<{ place: Place }>(`/api/worlds/${worldId}/places`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "places"] });
    },
  });
}

export function useUpdatePlace(worldId: number, placeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PlaceInput>) =>
      fetchJson<{ place: Place }>(`/api/worlds/${worldId}/places/${placeId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "places"] });
      queryClient.invalidateQueries({
        queryKey: ["worlds", worldId, "places", placeId],
      });
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

export function useDeletePlace(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (placeId: number) =>
      fetchJson<{ place: Place }>(`/api/worlds/${worldId}/places/${placeId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "places"] });
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}
