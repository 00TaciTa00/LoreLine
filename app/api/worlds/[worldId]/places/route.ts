import { createEntityListRoutes } from "@/lib/api/entity-routes";
import { placeEntity } from "@/lib/api/entity-configs";

// GET  /api/worlds/:worldId/places - 목록
// POST /api/worlds/:worldId/places - 생성
export const { GET, POST } = createEntityListRoutes(placeEntity);
