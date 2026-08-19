import { Suspense } from "react";

import { WorldTimelineView } from "./WorldTimelineView";

export default function WorldTimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          불러오는 중...
        </div>
      }
    >
      <WorldTimelineView />
    </Suspense>
  );
}
