import type { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = '', ...props }: TextareaProps) {
  const classes = [
    'textarea',
    error ? 'textarea--error' : '',
    className,
  ].filter(Boolean).join(' ');

  return <textarea className={classes} {...props} />;
}
