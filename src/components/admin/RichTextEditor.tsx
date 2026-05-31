"use client";

import { useEffect, useRef, useState } from "react";

type RichTextEditorProps = {
  defaultValue?: string | null;
  label: string;
  name: string;
};

type ToolbarButton = {
  ariaLabel: string;
  command: string;
  label: string;
  state: string;
  value?: string;
};

const toolbarButtons: ToolbarButton[] = [
  { label: "B", ariaLabel: "Bold", command: "bold", state: "bold" },
  { label: "I", ariaLabel: "Italic", command: "italic", state: "italic" },
  { label: "U", ariaLabel: "Underline", command: "underline", state: "underline" },
  { label: "H3", ariaLabel: "Heading", command: "formatBlock", value: "h3", state: "formatBlock:h3" },
  { label: "P", ariaLabel: "Paragraph", command: "formatBlock", value: "p", state: "formatBlock:p" },
  { label: "UL", ariaLabel: "Bullet list", command: "insertUnorderedList", state: "insertUnorderedList" },
  { label: "OL", ariaLabel: "Numbered list", command: "insertOrderedList", state: "insertOrderedList" },
  { label: "Tx", ariaLabel: "Clear formatting", command: "removeFormat", state: "" },
];

function normalizeUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function RichTextEditor({ defaultValue, label, name }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialValue = defaultValue ?? "";

    if (editorRef.current) {
      editorRef.current.innerHTML = initialValue;
    }

    if (inputRef.current) {
      inputRef.current.value = initialValue;
    }

    const form = editorRef.current?.closest("form");
    form?.addEventListener("submit", syncInput);

    return () => {
      form?.removeEventListener("submit", syncInput);
    };
  }, [defaultValue]);

  function syncInput() {
    if (inputRef.current) {
      inputRef.current.value = editorRef.current?.innerHTML ?? "";
    }
  }

  function refreshToolbarState() {
    const formatBlock = document.queryCommandValue("formatBlock").toLowerCase();

    setActiveStates({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      "formatBlock:h3": formatBlock === "h3",
      "formatBlock:p": formatBlock === "p" || formatBlock === "div",
    });
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncInput();
    refreshToolbarState();
  }

  function createLink() {
    const url = normalizeUrl(window.prompt("Enter link URL") ?? "");

    if (!url) {
      return;
    }

    runCommand("createLink", url);
  }

  return (
    <div className="admin-rich-text-field">
      <span>{label}</span>
      <input ref={inputRef} name={name} type="hidden" defaultValue={defaultValue ?? ""} />
      <div className="admin-rich-text-toolbar" aria-label={`${label} formatting controls`}>
        {toolbarButtons.map((button) => (
          <button
            aria-label={button.ariaLabel}
            aria-pressed={button.state ? activeStates[button.state] ?? false : undefined}
            className={button.state && activeStates[button.state] ? "active" : undefined}
            key={button.ariaLabel}
            onClick={() => runCommand(button.command, button.value)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {button.label}
          </button>
        ))}
        <button
          aria-label="Add link"
          onClick={createLink}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          Link
        </button>
        <button
          aria-label="Remove link"
          onClick={() => runCommand("unlink")}
          onMouseDown={(event) => event.preventDefault()}
          type="button"
        >
          Unlink
        </button>
      </div>
      <div
        aria-label={label}
        aria-multiline="true"
        className="admin-rich-text-editor"
        contentEditable
        onBlur={() => {
          syncInput();
          refreshToolbarState();
        }}
        onInput={syncInput}
        onKeyUp={() => {
          syncInput();
          refreshToolbarState();
        }}
        onMouseUp={refreshToolbarState}
        onPaste={(event) => {
          event.preventDefault();
          runCommand("insertText", event.clipboardData.getData("text/plain"));
        }}
        ref={editorRef}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
}
