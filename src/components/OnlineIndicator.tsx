import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function OnlineIndicator({ 
  isOnline, 
  size = "md", 
  showLabel = false,
  className 
}: OnlineIndicatorProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  const labelSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="relative">
        <div
          className={cn(
            "rounded-full",
            sizeClasses[size],
            isOnline ? "bg-green-500" : "bg-muted-foreground/50"
          )}
        />
        {isOnline && (
          <div
            className={cn(
              "absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75",
              sizeClasses[size]
            )}
          />
        )}
      </div>
      {showLabel && (
        <span
          className={cn(
            labelSizes[size],
            isOnline ? "text-green-500" : "text-muted-foreground"
          )}
        >
          {isOnline ? "Online" : "Offline"}
        </span>
      )}
    </div>
  );
}
