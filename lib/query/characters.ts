import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchJson } from "@/lib/api/client";
import type { Character, EventItem } from "@/lib/api/types";

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
      fetchJson<{ character: Character; events: EventItem[] }>(
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
