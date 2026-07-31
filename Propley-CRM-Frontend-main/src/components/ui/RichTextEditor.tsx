'use client';

import dynamic from 'next/dynamic';

export const RichTextEditor = dynamic(
  () => import('./QuillEditor').then((mod) => mod.QuillEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[150px] w-full animate-pulse bg-stone border border-stone-alt rounded-lg" />
    ),
  }
);
