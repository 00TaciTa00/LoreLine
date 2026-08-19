"use client";

import { useId, useState } from "react";

import { PRESET_COLORS, normalizeHexColor } from "@/lib/colors";

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const inputId = useId();

  // 헥사 입력은 타이핑 도중 "#3b8" 같은 미완성 상태를 거치므로 별도로 들고 있다가
  // 해석 가능한 값이 될 때만 실제 색으로 반영한다.
  const [hexDraft, setHexDraft] = useState(value);
  const [hexInvalid, setHexInvalid] = useState(false);

  /** 바깥에서 색이 바뀌면(프리셋·네이티브 피커) 입력창도 따라간다 */
  function commit(color: string) {
    onChange(color);
    setHexDraft(color);
    setHexInvalid(false);
  }

  function handleHexChange(raw: string) {
    setHexDraft(raw);
    const normalized = normalizeHexColor(raw);
    if (normalized) {
      onChange(normalized);
      setHexInvalid(false);
    } else {
      setHexInvalid(raw.trim() !== "");
    }
  }

  /** 입력창을 벗어날 때 미완성 값이면 현재 색으로 되돌린다 */
  function handleHexBlur() {
    const normalized = normalizeHexColor(hexDraft);
    if (normalized) {
      commit(normalized);
    } else {
      setHexDraft(value);
      setHexInvalid(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => commit(color)}
            aria-label={color}
            aria-pressed={value.toLowerCase() === color}
            // 흰색 계열이 흰 배경에서 사라지지 않도록 테두리를 준다
            className={`h-6 w-6 rounded-full border border-zinc-300 ring-offset-2 ring-offset-white transition-shadow dark:border-zinc-600 dark:ring-offset-zinc-900 ${
              value.toLowerCase() === color
                ? "ring-2 ring-zinc-900 dark:ring-zinc-50"
                : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          색상 직접 선택
        </label>
        <input
          id={inputId}
          type="color"
          // type="color"는 #rrggbb만 받는다. 짧은 형식이나 예전 데이터가
          // 들어와도 깨지지 않도록 정규화해서 넘긴다.
          value={normalizeHexColor(value) ?? "#000000"}
          onChange={(e) => commit(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-zinc-300 bg-transparent p-0.5 dark:border-zinc-700"
        />

        <input
          type="text"
          value={hexDraft}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          placeholder="#3b82f6"
          spellCheck={false}
          aria-label="색상 헥사코드"
          aria-invalid={hexInvalid}
          className={`w-28 rounded border px-2 py-1 font-mono text-sm dark:bg-zinc-950 ${
            hexInvalid
              ? "border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        />

        {hexInvalid && (
          <span className="text-xs text-red-600">
            #rgb 또는 #rrggbb 형식
          </span>
        )}
      </div>
    </div>
  );
}
