"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

/**
 * 사건·공간·인물의 "내용"란에 쓰는 서식 편집기.
 *
 * 저장 포맷은 HTML 문자열이며 기존 `description`(text) 컬럼을 그대로 쓴다.
 * 이전에 평문으로 저장된 값도 Tiptap이 문단으로 파싱해 그대로 보여준다.
 *
 * 보안: 저장된 HTML을 다시 불러올 때 Tiptap이 ProseMirror 스키마로 파싱하며
 * 스키마에 없는 태그·속성(script, onerror 등)은 버린다. 따라서 편집기를 통해
 * 오가는 경로에서는 별도 sanitize가 필요 없다. 다만 나중에 이 HTML을
 * `dangerouslySetInnerHTML`로 직접 렌더링하게 되면 그때는 sanitize가 필요하다.
 */
type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

/** 내용이 사실상 비었는지 (빈 문단만 있는 경우 포함) */
export function isEmptyRichText(html: string): boolean {
  return richTextToPlainText(html) === "";
}

/**
 * 목록의 한 줄 미리보기처럼 서식 없이 보여줘야 하는 자리에 쓴다.
 * 태그를 지우고 엔티티를 되돌린 뒤 공백을 정리한다.
 *
 * 여기서 나온 값은 React가 텍스트로 렌더링하므로(=이스케이프됨)
 * dangerouslySetInnerHTML로 넘기지 않는 한 안전하다.
 */
export function richTextToPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    // SSR에서 즉시 렌더하면 하이드레이션 불일치가 나므로 클라이언트에서만 그린다.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-sm min-h-[8rem] max-h-[24rem] overflow-y-auto px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  return (
    <div className="rounded border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const buttons: { label: string; title: string; active: boolean; run: () => void }[] =
    [
      {
        label: "B",
        title: "굵게",
        active: editor.isActive("bold"),
        run: () => editor.chain().focus().toggleBold().run(),
      },
      {
        label: "I",
        title: "기울임",
        active: editor.isActive("italic"),
        run: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        label: "S",
        title: "취소선",
        active: editor.isActive("strike"),
        run: () => editor.chain().focus().toggleStrike().run(),
      },
      {
        label: "H",
        title: "제목",
        active: editor.isActive("heading", { level: 3 }),
        run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        label: "•",
        title: "목록",
        active: editor.isActive("bulletList"),
        run: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        label: "1.",
        title: "번호 목록",
        active: editor.isActive("orderedList"),
        run: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        label: "❝",
        title: "인용",
        active: editor.isActive("blockquote"),
        run: () => editor.chain().focus().toggleBlockquote().run(),
      },
    ];

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-zinc-200 p-1 dark:border-zinc-800">
      {buttons.map((b) => (
        <button
          key={b.title}
          type="button"
          title={b.title}
          aria-label={b.title}
          aria-pressed={b.active}
          // 버튼을 누르는 순간 에디터에서 포커스가 빠지면 선택 영역이 풀려
          // 서식이 엉뚱한 곳에 적용되거나 아예 먹지 않는다.
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
          className={`min-w-8 rounded px-2 py-1 text-sm transition-colors ${
            b.active
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
