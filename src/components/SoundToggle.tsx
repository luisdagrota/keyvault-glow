import { Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSound } from "@/contexts/SoundContext";

interface SoundToggleProps {
  variant?: "default" | "compact";
}

export function SoundToggle({ variant = "default" }: SoundToggleProps) {
  const { soundEnabled, toggleSound } = useSound();

  if (variant === "compact") {
    return (
      <button
        onClick={toggleSound}
        className="flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent transition-colors"
        title={soundEnabled ? "Desativar som" : "Ativar som"}
      >
        {soundEnabled ? (
          <Volume2 className="h-5 w-5 text-foreground" />
        ) : (
          <VolumeX className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        {soundEnabled ? (
          <Volume2 className="h-5 w-5 text-primary" />
        ) : (
          <VolumeX className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <Label htmlFor="sound-toggle" className="text-sm font-medium cursor-pointer">
            Som de clique
          </Label>
          <p className="text-xs text-muted-foreground">
            Reproduzir som ao clicar em botões
          </p>
        </div>
      </div>
      <Switch
        id="sound-toggle"
        checked={soundEnabled}
        onCheckedChange={toggleSound}
      />
    </div>
  );
}
