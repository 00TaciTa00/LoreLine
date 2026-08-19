"use client";

import { COLOR_SWATCHES } from "@/lib/colors";

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
};

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={color}
          className={`h-6 w-6 rounded-full ring-offset-2 ring-offset-white transition-shadow dark:ring-offset-zinc-900 ${
            value === color ? "ring-2 ring-zinc-900 dark:ring-zinc-50" : ""
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
