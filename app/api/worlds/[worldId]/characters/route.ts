import { createEntityListRoutes } from "@/lib/api/entity-routes";
import { characterEntity } from "@/lib/api/entity-configs";

// GET  /api/worlds/:worldId/characters - 목록
// POST /api/worlds/:worldId/characters - 생성
export const { GET, POST } = createEntityListRoutes(characterEntity);
