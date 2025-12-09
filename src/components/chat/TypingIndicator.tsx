import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  isTyping: boolean;
  label?: string;
  className?: string;
}

export function TypingIndicator({ isTyping, label = "digitando", className }: TypingIndicatorProps) {
  if (!isTyping) return null;

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground py-2", className)}>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="italic">{label}...</span>
    </div>
  );
}
