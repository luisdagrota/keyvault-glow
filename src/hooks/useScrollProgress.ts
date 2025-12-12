import { useEffect, useState } from "react";

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const [needsFallback, setNeedsFallback] = useState(false);

  useEffect(() => {
    // Check if browser supports scroll-driven animations
    const supportsScrollTimeline = CSS.supports("animation-timeline", "scroll()");
    setNeedsFallback(!supportsScrollTimeline);

    if (supportsScrollTimeline) {
      return; // Let CSS handle it
    }

    // JavaScript fallback for unsupported browsers
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0;
      setProgress(scrollPercent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { progress, needsFallback };
}
