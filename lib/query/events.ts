import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { EventInput, EventItem } from "@/lib/api/types";

export function useEvents(worldId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "events"],
    queryFn: () =>
      fetchJson<{ events: EventItem[] }>(`/api/worlds/${worldId}/events`),
    select: (data) => data.events,
    enabled: Number.isFinite(worldId),
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
