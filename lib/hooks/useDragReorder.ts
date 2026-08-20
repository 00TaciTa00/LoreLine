"use client";

import { useState } from "react";

/**
 * 세로 목록을 끌어서 재정렬하는 공통 동작.
 *
 * 사건·공간·인물 목록이 같은 방식으로 동작하므로 상태와 핸들러를 여기 모은다.
 *
 * 삽입 위치는 **화면에 보이는 목록 기준의 "틈" 번호**로 들고 있는다.
 * 0이면 첫 항목 앞, length면 마지막 항목 뒤다. 삽입선을 그릴 때와 서버로 보낼
 * 때 기준이 다르면 한 항목에 선이 두 개 그려지는 식으로 어긋나므로, 화면 기준
 * 하나만 유지하다가 놓는 순간에 한 번만 변환한다.
 *
 * HTML5 드래그는 터치·키보드로 동작하지 않는다. 호출하는 쪽에서 대체 수단을
 * 함께 제공해야 한다.
 */
/**
 * 끌 수 없을 때는 빈 객체가 나온다. 그대로 펼쳐 쓰면 draggable 속성과
 * 핸들러가 붙지 않아 자연스럽게 드래그가 꺼진다.
 */
type ItemProps =
  | {
      draggable: true;
      onDragStart: (e: React.DragEvent) => void;
      onDragEnd: () => void;
      onDragOver: (e: React.DragEvent) => void;
      onDrop: (e: React.DragEvent) => void;
    }
  | Record<string, never>;

export type DragReorder = {
  draggingId: number | null;
  /** 이 자리(틈)에 삽입선을 그릴지 */
  showLineAt: (gap: number) => boolean;
  itemProps: (id: number, index: number) => ItemProps;
  /** 목록 바깥으로 나가면 삽입선을 지운다 */
  containerProps:
    | { onDragLeave: (e: React.DragEvent) => void }
    | Record<string, never>;
};

export function useDragReorder(
  /** 현재 화면 순서의 id 목록 */
  ids: number[],
  /** 끌던 항목을 제외한 목록 기준의 삽입 위치로 호출된다 */
  onReorder: (id: number, toIndex: number) => void,
  options?: {
    /**
     * false면 끌 수 없다. 목록이 걸러져 있을 때 쓴다. 보이는 것만 놓고
     * 순서를 바꾸면 숨은 항목 사이 어디에 놓였는지 알 수 없어, 놓은 자리와
     * 실제 결과가 어긋난다.
     */
    enabled?: boolean;
  },
): DragReorder {
  const enabled = options?.enabled ?? true;
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropGap, setDropGap] = useState<number | null>(null);

  function reset() {
    setDraggingId(null);
    setDropGap(null);
  }

  function handleDrop() {
    if (draggingId !== null && dropGap !== null) {
      // 끌던 항목을 빼고 나면 뒤쪽 자리는 하나씩 당겨진다.
      const fromIndex = ids.indexOf(draggingId);
      const toIndex =
        fromIndex !== -1 && fromIndex < dropGap ? dropGap - 1 : dropGap;
      onReorder(draggingId, toIndex);
    }
    reset();
  }

  if (!enabled) {
    return {
      draggingId: null,
      showLineAt: () => false,
      itemProps: () => ({}),
      containerProps: {},
    };
  }

  return {
    draggingId,

    showLineAt: (gap) => draggingId !== null && dropGap === gap,

    itemProps: (id, index) => ({
      draggable: true,

      onDragStart: (e) => {
        setDraggingId(id);
        e.dataTransfer.effectAllowed = "move";
        // Firefox는 데이터가 설정돼야 드래그를 시작한다.
        e.dataTransfer.setData("text/plain", String(id));
      },

      onDragEnd: reset,

      onDragOver: (e) => {
        if (draggingId === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        // 항목의 위/아래 절반 중 어디에 있는지로 삽입할 틈을 정한다.
        const rect = e.currentTarget.getBoundingClientRect();
        const isBottomHalf = e.clientY > rect.top + rect.height / 2;
        setDropGap(isBottomHalf ? index + 1 : index);
      },

      onDrop: (e) => {
        e.preventDefault();
        handleDrop();
      },
    }),

    containerProps: {
      onDragLeave: (e) => {
        // 자식 사이를 오갈 때는 무시하고, 목록 밖으로 나갔을 때만 지운다.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDropGap(null);
        }
      },
    },
  };
}
