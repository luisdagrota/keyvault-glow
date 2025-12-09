import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  variant?: "icon" | "mobile";
}

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === "mobile") {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start h-12 text-base"
        onClick={toggleTheme}
      >
        {theme === "dark" ? (
          <>
            <Sun className="h-5 w-5 mr-3" />
            Modo Claro
          </>
        ) : (
          <>
            <Moon className="h-5 w-5 mr-3" />
            Modo Escuro
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggleTheme}
      title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
