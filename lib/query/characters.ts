import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type {
  Character,
  EventPlacement,
  EventSummary,
} from "@/lib/api/types";
import { reorderById } from "@/lib/timeline/reorder";

export function useCharacters(worldId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "characters"],
    queryFn: () =>
      fetchJson<{ characters: Character[] }>(
        `/api/worlds/${worldId}/characters`,
      ),
    select: (data) => data.characters,
    enabled: Number.isFinite(worldId),
  });
}

export function useCharacter(worldId: number, characterId: number) {
  return useQuery({
    queryKey: ["worlds", worldId, "characters", characterId],
    queryFn: () =>
      fetchJson<{ character: Character; events: EventSummary[] }>(
        `/api/worlds/${worldId}/characters/${characterId}`,
      ),
    enabled: Number.isFinite(worldId) && Number.isFinite(characterId),
  });
}

type CharacterInput = { name: string; description?: string; color?: string };

export function useCreateCharacter(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CharacterInput) =>
      fetchJson<{ character: Character }>(
        `/api/worlds/${worldId}/characters`,
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["worlds", worldId, "characters"],
      });
    },
  });
}

export function useUpdateCharacter(worldId: number, characterId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CharacterInput>) =>
      fetchJson<{ character: Character }>(
        `/api/worlds/${worldId}/characters/${characterId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["worlds", worldId, "characters"],
      });
      queryClient.invalidateQueries({
        queryKey: ["worlds", worldId, "characters", characterId],
      });
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

/**
 * 드래그로 인물 순서를 바꾼다. 격자의 열 순서도 이 순서를 따른다.
 * 사건 재정렬과 같은 이유로 낙관적 갱신을 쓴다(놓는 즉시 반응해야 한다).
 */
export function useReorderCharacter(worldId: number) {
  const queryClient = useQueryClient();
  const queryKey = ["worlds", worldId, "characters"];

  return useMutation({
    mutationFn: ({
      characterId,
      placement,
    }: {
      characterId: number;
      placement: EventPlacement;
    }) =>
      fetchJson<{ character: Character }>(
        `/api/worlds/${worldId}/characters/${characterId}`,
        { method: "PATCH", body: JSON.stringify({ placement }) },
      ),

    onMutate: async ({ characterId, placement }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ characters: Character[] }>(
        queryKey,
      );

      if (previous) {
        queryClient.setQueryData(queryKey, {
          ...previous,
          characters: reorderById(previous.characters, characterId, placement),
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
      // 격자 열 순서가 인물 순서를 따르므로 사건 화면도 다시 그린다.
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}

export function useDeleteCharacter(worldId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (characterId: number) =>
      fetchJson<{ character: Character }>(
        `/api/worlds/${worldId}/characters/${characterId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["worlds", worldId, "characters"],
      });
      queryClient.invalidateQueries({ queryKey: ["worlds", worldId, "events"] });
    },
  });
}
