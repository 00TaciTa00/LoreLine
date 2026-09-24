import { createEntityListRoutes } from "@/lib/api/entity-routes";
import { eraEntity } from "@/lib/api/entity-configs";

// GET  /api/worlds/:worldId/eras - 목록
// POST /api/worlds/:worldId/eras - 생성
export const { GET, POST } = createEntityListRoutes(eraEntity);
