import { createEntityItemRoutes } from "@/lib/api/entity-routes";
import { placeEntity } from "@/lib/api/entity-configs";

// GET    /api/worlds/:worldId/places/:id - 단건 + 딸린 사건 (교차 탐색)
// PATCH  /api/worlds/:worldId/places/:id - 수정 (placement로 순서 변경도 겸한다)
// DELETE /api/worlds/:worldId/places/:id - 소프트 삭제
export const { GET, PATCH, DELETE } = createEntityItemRoutes(placeEntity);
