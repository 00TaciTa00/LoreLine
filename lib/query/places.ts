import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { EventPlacement, EventSummary, Place } from "@/lib/api/types";
import { reorderById } from "@/lib/timeline/reorder";

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

/**
 * 드래그로 공간 순서를 바꾼다. 격자의 열 순서도 이 순서를 따른다.
 * 사건 재정렬과 같은 이유로 낙관적 갱신을 쓴다(놓는 즉시 반응해야 한다).
 */
export function useReorderPlace(worldId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["worlds", worldId, "places"];

  return useMutation({
    mutationFn: ({
      placeId,
      placement,
    }: {
      placeId: number;
      placement: EventPlacement;
    }) =>
      fetchJson<{ place: Place }>(`/api/worlds/${worldId}/places/${placeId}`, {
        method: "PATCH",
        body: JSON.stringify({ placement }),
      }),

    onMutate: async ({ placeId, placement }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ places: Place[] }>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          places: reorderById(previous.places, placeId, placement),
        });
      }

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      // 격자 열 순서가 공간 순서를 따르므로 사건 화면도 다시 그린다.
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
