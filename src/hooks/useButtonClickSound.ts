import { useEffect, useRef } from "react";

export function useButtonClickSound(enabled: boolean = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element once
    audioRef.current = new Audio("/sounds/button-click.mp3");
    audioRef.current.volume = 0.3; // 30% volume

    const playSound = () => {
      if (audioRef.current && enabled) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!enabled) return;
      
      const target = event.target as HTMLElement;
      
      // Check if clicked element or any parent is a clickable element
      const clickable = target.closest(
        'button, a, [role="button"], [data-clickable], input[type="submit"], input[type="button"]'
      );

      if (clickable) {
        playSound();
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [enabled]);
}
