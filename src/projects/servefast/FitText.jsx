import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Shrinks the type until the passage fits its window. Nothing ever scrolls.
export default function FitText({ children, max = 22, min = 9, className, style }) {
  const boxRef = useRef(null);
  const textRef = useRef(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    let lo = min;
    let hi = max;
    let best = min;
    for (let i = 0; i < 12 && lo <= hi; i += 1) {
      const mid = (lo + hi) / 2;
      text.style.fontSize = `${mid}px`;
      const fits = text.scrollHeight <= box.clientHeight && text.scrollWidth <= box.clientWidth;
      if (fits) {
        best = mid;
        lo = mid + 0.5;
      } else {
        hi = mid - 0.5;
      }
    }
    text.style.fontSize = `${best}px`;
    setSize(best);
  });

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => setSize((s) => s));
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      className={`h-full w-full overflow-hidden flex items-center ${className || ""}`}
      style={style}
    >
      <div ref={textRef} className="w-full" style={{ fontSize: size, lineHeight: 1.45 }}>
        {children}
      </div>
    </div>
  );
}
