"use client"

import ReactMarkdown from "react-markdown"

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
