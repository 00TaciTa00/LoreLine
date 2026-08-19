import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { EventInput, EventItem, EventPlacement } from "@/lib/api/types";
import { reorderEvents } from "@/lib/timeline/reorder";

export function useEvents(worldId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "events"],
    queryFn: () =>
      fetchJson<{ events: EventItem[] }>(`/api/worlds/${worldId}/events`),
    select: (data) => data.events,
    enabled: Number.isFinite(worldId),
  });
}

/**
 * 드래그로 사건 순서를 바꾼다.
 *
 * 순서 변경만 하는 별도 훅인 이유: 드래그는 놓는 즉시 반응해야 해서 서버 응답을
 * 기다릴 수 없다. 캐시를 먼저 옮겨두고(낙관적 갱신) 실패하면 되돌린다.
 * 실제 sort_key는 서버가 정하므로, 응답이 오면 서버 순서로 다시 맞춘다.
 */
export function useReorderEvent(worldId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["worlds", worldId, "events"];

  return useMutation({
    mutationFn: ({
      eventId,
      placement,
    }: {
      eventId: number;
      placement: EventPlacement;
    }) =>
      fetchJson<{ event: EventItem }>(
        `/api/worlds/${worldId}/events/${eventId}`,
        { method: "PATCH", body: JSON.stringify({ placement }) },
      ),

    onMutate: async ({ eventId, placement }) => {
      // 진행 중인 조회가 끝나면서 낙관적 갱신을 덮어쓰지 않도록 멈춘다.
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ events: EventItem[] }>(
        queryKey,
      );

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          events: reorderEvents(previous.events, eventId, placement),
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
    },
  });
}

export function useCreateEvent(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) =>
      fetchJson<{ event: EventItem }>(`/api/worlds/${worldId}/events`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

export function useUpdateEvent(worldId: number, eventId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<EventInput>) =>
      fetchJson<{ event: EventItem }>(
        `/api/worlds/${worldId}/events/${eventId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

export function useDeleteEvent(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number) =>
      fetchJson<{ event: EventItem }>(
        `/api/worlds/${worldId}/events/${eventId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}
