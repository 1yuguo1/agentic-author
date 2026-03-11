"use client";

import { useEffect, useImperativeHandle, forwardRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { BoldOutlined, ItalicOutlined } from "@ant-design/icons";
import { Button } from "antd";

export interface RichTextInputRef {
  getText: () => string;
  clear: () => void;
  focus: () => void;
}

interface RichTextInputProps {
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  disabled?: boolean;
  onSubmit?: () => void;
}

export const RichTextInput = forwardRef<RichTextInputRef, RichTextInputProps>(
  ({ placeholder = "输入内容…", minHeight = 72, maxHeight = 160, disabled, onSubmit }, ref) => {
    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder }),
      ],
      content: "",
      editable: !disabled,
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none focus:outline-none px-3 py-2 overflow-y-auto",
        },
        handleKeyDown: (_, ev) => {
          if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            onSubmit?.();
            return true;
          }
          return false;
        },
      },
    });

    useImperativeHandle(
      ref,
      () => ({
        getText: () => editor?.getText() ?? "",
        clear: () => editor?.commands.clearContent(),
        focus: () => editor?.commands.focus(),
      }),
      [editor]
    );

    useEffect(() => {
      if (editor === null) return;
      editor.setEditable(!disabled);
    }, [editor, disabled]);

    if (!editor) return null;

    return (
      <div
        className="rounded-[var(--border-radius)] border border-[var(--border-color)] bg-[var(--panel-bg)] focus-within:border-[var(--sidebar-active-color)] focus-within:shadow-[0_0_0_2px_rgba(22,119,255,0.1)] transition-all overflow-hidden"
        style={{ minHeight, maxHeight }}
      >
        <div className="flex items-center gap-0.5 px-1 py-1 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]">
          <Button
            type="text"
            size="small"
            icon={<BoldOutlined />}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "!bg-[var(--sidebar-active-bg)]" : ""}
          />
          <Button
            type="text"
            size="small"
            icon={<ItalicOutlined />}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "!bg-[var(--sidebar-active-bg)]" : ""}
          />
        </div>
        <EditorContent editor={editor} />
      </div>
    );
  }
);

RichTextInput.displayName = "RichTextInput";
