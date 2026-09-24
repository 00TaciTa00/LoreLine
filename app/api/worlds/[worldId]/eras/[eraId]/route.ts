import { createEntityItemRoutes } from "@/lib/api/entity-routes";
import { eraEntity } from "@/lib/api/entity-configs";

// GET    /api/worlds/:worldId/eras/:id - 단건 + 딸린 사건 (교차 탐색)
// PATCH  /api/worlds/:worldId/eras/:id - 수정 (placement로 순서 변경도 겸한다)
// DELETE /api/worlds/:worldId/eras/:id - 소프트 삭제
export const { GET, PATCH, DELETE } = createEntityItemRoutes(eraEntity);
