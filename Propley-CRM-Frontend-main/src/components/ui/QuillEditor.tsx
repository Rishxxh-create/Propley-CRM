'use client';

import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function QuillEditor({ value, onChange, placeholder = 'Write your note here...', className }: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInternalChange = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!quillRef.current) {
      quillRef.current = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder,
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'clean']
          ]
        }
      });

      quillRef.current.on('text-change', () => {
        isInternalChange.current = true;
        onChange(quillRef.current?.root.innerHTML || '');
      });
    }
  }, [onChange, placeholder]);

  useEffect(() => {
    if (quillRef.current) {
      // Prevent resetting cursor position if change came from Quill
      if (isInternalChange.current) {
        isInternalChange.current = false;
        return;
      }

      if (value !== quillRef.current.root.innerHTML) {
        // To avoid focus loss and cursor jumps on external updates
        const selection = quillRef.current.getSelection();
        quillRef.current.clipboard.dangerouslyPasteHTML(value);
        if (selection) {
          quillRef.current.setSelection(selection);
        }
      }
    }
  }, [value]);

  return (
    <div className={className}>
      <div ref={containerRef} className="quill-propley-editor" />
      <style jsx global>{`
        .quill-propley-editor {
          min-height: 150px;
          border-radius: 0 !important;
          border: 1px solid var(--color-stone-alt) !important;
          font-family: inherit;
          font-size: 0.75rem; /* text-xs */
          background-color: var(--color-stone);
        }
        .quill-propley-editor:focus-within {
          border-color: var(--color-gold) !important;
        }
        .ql-toolbar.ql-snow {
          border-radius: 0 !important;
          border: 1px solid var(--color-stone-alt) !important;
          border-bottom: none !important;
          background-color: var(--color-white);
          font-family: inherit;
        }
        .ql-container.ql-snow {
          border: 1px solid var(--color-stone-alt) !important;
          border-radius: 0 !important;
        }
        .ql-editor {
          color: var(--color-ink);
        }
        .ql-editor.ql-blank::before {
          color: #a1a1aa; /* text-zinc-400 */
          font-style: normal;
        }
      `}</style>
    </div>
  );
}
