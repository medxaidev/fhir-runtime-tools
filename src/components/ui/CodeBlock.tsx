interface CodeBlockProps {
  children: string;
}

export function CodeBlock({ children }: CodeBlockProps) {
  return <div className="code-block">{children}</div>;
}

interface CodeInlineProps {
  children: string;
}

export function CodeInline({ children }: CodeInlineProps) {
  return <code className="code-inline">{children}</code>;
}
