import { cn } from "@/lib/utils";
import { Gem, Award, Medal, Crown, Sparkles } from "lucide-react";

export interface SellerLevelData {
  id: string;
  name: string;
  icon: React.ElementType;
  minSales: number;
  minRating?: number;
  isTopRequired?: boolean;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    text: string;
    border: string;
  };
  xpMultiplier: number;
}

export const SELLER_LEVELS: SellerLevelData[] = [
  {
    id: "bronze",
    name: "Bronze",
    icon: Medal,
    minSales: 0,
    colors: {
      primary: "from-amber-600 via-orange-500 to-amber-700",
      secondary: "from-amber-700 to-orange-600",
      glow: "rgba(217, 119, 6, 0.6)",
      text: "text-amber-500",
      border: "border-amber-500/50",
    },
    xpMultiplier: 1,
  },
  {
    id: "silver",
    name: "Prata",
    icon: Award,
    minSales: 10,
    colors: {
      primary: "from-slate-300 via-gray-200 to-slate-400",
      secondary: "from-slate-400 to-gray-300",
      glow: "rgba(148, 163, 184, 0.7)",
      text: "text-slate-300",
      border: "border-slate-400/50",
    },
    xpMultiplier: 1.5,
  },
  {
    id: "gold",
    name: "Ouro",
    icon: Crown,
    minSales: 30,
    colors: {
      primary: "from-yellow-400 via-amber-300 to-yellow-500",
      secondary: "from-yellow-500 to-amber-400",
      glow: "rgba(250, 204, 21, 0.7)",
      text: "text-yellow-400",
      border: "border-yellow-400/50",
    },
    xpMultiplier: 2,
  },
  {
    id: "platinum",
    name: "Platina",
    icon: Sparkles,
    minSales: 30,
    minRating: 4.8,
    colors: {
      primary: "from-cyan-300 via-teal-200 to-cyan-400",
      secondary: "from-cyan-400 to-teal-300",
      glow: "rgba(34, 211, 238, 0.7)",
      text: "text-cyan-300",
      border: "border-cyan-400/50",
    },
    xpMultiplier: 2.5,
  },
  {
    id: "diamond",
    name: "Diamante",
    icon: Gem,
    minSales: 50,
    minRating: 4.5,
    isTopRequired: true,
    colors: {
      primary: "from-violet-400 via-purple-300 to-fuchsia-400",
      secondary: "from-purple-500 to-fuchsia-400",
      glow: "rgba(167, 139, 250, 0.8)",
      text: "text-violet-300",
      border: "border-violet-400/50",
    },
    xpMultiplier: 3,
  },
];

export const calculateSellerLevel = (
  totalSales: number,
  averageRating: number,
  isTopSeller: boolean
): SellerLevelData => {
  // Check from highest to lowest
  if (isTopSeller && totalSales >= 50 && averageRating >= 4.5) {
    return SELLER_LEVELS[4]; // Diamond
  }
  if (totalSales >= 30 && averageRating >= 4.8) {
    return SELLER_LEVELS[3]; // Platinum
  }
  if (totalSales >= 30) {
    return SELLER_LEVELS[2]; // Gold
  }
  if (totalSales >= 10) {
    return SELLER_LEVELS[1]; // Silver
  }
  return SELLER_LEVELS[0]; // Bronze
};

export const getNextLevel = (currentLevel: SellerLevelData): SellerLevelData | null => {
  const currentIndex = SELLER_LEVELS.findIndex(l => l.id === currentLevel.id);
  if (currentIndex < SELLER_LEVELS.length - 1) {
    return SELLER_LEVELS[currentIndex + 1];
  }
  return null;
};

export const calculateXP = (totalSales: number, averageRating: number): number => {
  return Math.floor(totalSales * 10 + averageRating * 50);
};

interface SellerLevelBadgeProps {
  level: SellerLevelData;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  showProgress?: boolean;
  currentSales?: number;
  currentRating?: number;
  isTopSeller?: boolean;
  animated?: boolean;
}

export const SellerLevelBadge = ({
  level,
  size = "md",
  showLabel = true,
  showProgress = false,
  currentSales = 0,
  currentRating = 0,
  isTopSeller = false,
  animated = true,
}: SellerLevelBadgeProps) => {
  const sizeClasses = {
    sm: { container: "h-8 w-8", icon: "h-4 w-4", text: "text-xs" },
    md: { container: "h-10 w-10", icon: "h-5 w-5", text: "text-sm" },
    lg: { container: "h-14 w-14", icon: "h-7 w-7", text: "text-base" },
    xl: { container: "h-20 w-20", icon: "h-10 w-10", text: "text-lg" },
  };

  const Icon = level.icon;
  const nextLevel = getNextLevel(level);
  const xp = calculateXP(currentSales, currentRating);
  
  // Calculate progress to next level
  let progressPercent = 100;
  if (nextLevel) {
    const currentLevelSales = level.minSales;
    const nextLevelSales = nextLevel.minSales;
    const salesProgress = Math.min(100, ((currentSales - currentLevelSales) / (nextLevelSales - currentLevelSales)) * 100);
    progressPercent = Math.max(0, salesProgress);
  }

  return (
    <div className="flex items-center gap-3">
      {/* Level Badge */}
      <div className="relative group">
        {/* Outer glow ring */}
        {animated && (
          <div
            className={cn(
              "absolute inset-[-4px] rounded-full opacity-75",
              `bg-gradient-to-r ${level.colors.primary}`
            )}
            style={{
              animation: "level-glow 2s ease-in-out infinite",
              filter: `blur(8px)`,
              boxShadow: `0 0 30px ${level.colors.glow}`,
            }}
          />
        )}
        
        {/* Rotating border */}
        {animated && (
          <div
            className={cn(
              "absolute inset-[-2px] rounded-full",
              `bg-gradient-to-r ${level.colors.primary}`
            )}
            style={{
              animation: "level-spin 4s linear infinite",
            }}
          />
        )}
        
        {/* Inner badge */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-full bg-background/95 backdrop-blur-sm z-10",
            sizeClasses[size].container,
            level.colors.border,
            "border-2"
          )}
        >
          <Icon
            className={cn(
              sizeClasses[size].icon,
              level.colors.text,
              animated && "drop-shadow-lg"
            )}
            style={{
              filter: animated ? `drop-shadow(0 0 8px ${level.colors.glow})` : undefined,
            }}
          />
        </div>

        {/* Sparkle effects */}
        {animated && level.id !== "bronze" && (
          <>
            <div
              className="absolute top-0 right-0 w-2 h-2 rounded-full bg-white"
              style={{
                animation: "sparkle 1.5s ease-in-out infinite",
                boxShadow: `0 0 10px ${level.colors.glow}`,
              }}
            />
            <div
              className="absolute bottom-1 left-0 w-1.5 h-1.5 rounded-full bg-white"
              style={{
                animation: "sparkle 1.5s ease-in-out infinite 0.5s",
                boxShadow: `0 0 8px ${level.colors.glow}`,
              }}
            />
          </>
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-popover text-popover-foreground rounded-xl shadow-2xl border border-border opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 min-w-[180px]">
          <div className="text-center">
            <span className={cn("font-bold text-lg", level.colors.text)}>{level.name}</span>
            <p className="text-xs text-muted-foreground mt-1">
              {level.id === "bronze" && "Nível inicial"}
              {level.id === "silver" && "+10 vendas necessárias"}
              {level.id === "gold" && "+30 vendas necessárias"}
              {level.id === "platinum" && "+30 vendas e 4.8+ avaliação"}
              {level.id === "diamond" && "Top 5 vendedores + 50 vendas"}
            </p>
            <div className="mt-2 text-xs">
              <span className="text-primary font-semibold">{xp} XP</span>
              <span className="text-muted-foreground"> • </span>
              <span className="text-muted-foreground">{level.xpMultiplier}x bônus</span>
            </div>
          </div>
        </div>
      </div>

      {/* Label and Progress */}
      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-bold", sizeClasses[size].text, level.colors.text)}>
            {level.name}
          </span>
          {showProgress && nextLevel && (
            <div className="mt-1">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
                <span>{currentSales} vendas</span>
                <span>→</span>
                <span>{nextLevel.name}: {nextLevel.minSales}</span>
              </div>
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    `bg-gradient-to-r ${level.colors.primary}`
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes level-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes level-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

// Compact version for cards
export const SellerLevelCompact = ({
  level,
  animated = true,
}: {
  level: SellerLevelData;
  animated?: boolean;
}) => {
  const Icon = level.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
        "bg-gradient-to-r",
        level.colors.secondary,
        "text-background"
      )}
      style={{
        boxShadow: animated ? `0 0 12px ${level.colors.glow}` : undefined,
      }}
    >
      <Icon className="h-3 w-3" />
      <span>{level.name}</span>
    </div>
  );
};
