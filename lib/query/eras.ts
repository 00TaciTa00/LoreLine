import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { Era, EventPlacement, EventSummary } from "@/lib/api/types";
import { reorderById } from "@/lib/timeline/reorder";

export function useEras(worldId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "eras"],
    queryFn: () => fetchJson<{ eras: Era[] }>(`/api/worlds/${worldId}/eras`),
    select: (data) => data.eras,
    enabled: Number.isFinite(worldId),
  });
}

export function useEra(worldId: number, eraId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "eras", eraId],
    queryFn: () =>
      fetchJson<{ era: Era; events: EventSummary[] }>(
        `/api/worlds/${worldId}/eras/${eraId}`,
      ),
    enabled: Number.isFinite(worldId) && Number.isFinite(eraId),
  });
}

type EraInput = { name: string; description?: string; color?: string };

export function useCreateEra(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EraInput) =>
      fetchJson<{ era: Era }>(`/api/worlds/${worldId}/eras`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "eras"] });
    },
  });
}

export function useUpdateEra(worldId: number, eraId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<EraInput>) =>
      fetchJson<{ era: Era }>(`/api/worlds/${worldId}/eras/${eraId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "eras"] });
      queryClient.invalidateQueries({
        queryKey: ["worlds", worldId, "eras", eraId],
      });
      // 사건이 기간 이름·색을 함께 보여주므로 같이 새로 그린다.
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

export function useDeleteEra(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eraId: number) =>
      fetchJson<{ era: Era }>(`/api/worlds/${worldId}/eras/${eraId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "eras"] });
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

/** 드래그로 기간 순서를 바꾼다. 사건 재정렬과 같은 이유로 낙관적 갱신을 쓴다. */
export function useReorderEra(worldId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["worlds", worldId, "eras"];

  return useMutation({
    mutationFn: ({
      eraId,
      placement,
    }: {
      eraId: number;
      placement: EventPlacement;
    }) =>
      fetchJson<{ era: Era }>(`/api/worlds/${worldId}/eras/${eraId}`, {
        method: "PATCH",
        body: JSON.stringify({ placement }),
      }),

    onMutate: async ({ eraId, placement }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ eras: Era[] }>(queryKey);

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          eras: reorderById(previous.eras, eraId, placement),
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
