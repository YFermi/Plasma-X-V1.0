import React, { useState, useLayoutEffect } from 'react';

interface RippleProps {
  duration?: number;
  color?: string;
}

export function Ripple({ duration = 600, color = 'rgba(0, 240, 255, 0.3)' }: RippleProps) {
  const [rippleArray, setRippleArray] = useState<{ x: number, y: number, size: number }[]>([]);

  useLayoutEffect(() => {
    let bounce: any;
    if (rippleArray.length > 0) {
      clearTimeout(bounce);
      bounce = setTimeout(() => {
        setRippleArray([]);
      }, duration);
    }
    return () => clearTimeout(bounce);
  }, [rippleArray.length, duration]);

  const addRipple = (event: React.MouseEvent<HTMLDivElement>) => {
    const rippleContainer = event.currentTarget.getBoundingClientRect();
    const size =
      rippleContainer.width > rippleContainer.height
        ? rippleContainer.width
        : rippleContainer.height;
    const x = event.pageX - rippleContainer.x - size / 2;
    const y = event.pageY - rippleContainer.y - size / 2;
    const newRipple = { x, y, size };

    setRippleArray([...rippleArray, newRipple]);
  };

  return (
    <div 
      className="absolute inset-0 overflow-hidden rounded-[inherit]" 
      onMouseDown={addRipple}
    >
      {rippleArray.length > 0 &&
        rippleArray.map((ripple, index) => {
          return (
            <span
              key={"span" + index}
              style={{
                top: ripple.y,
                left: ripple.x,
                width: ripple.size,
                height: ripple.size,
                backgroundColor: color,
              }}
              className="ripple"
            />
          );
        })}
    </div>
  );
}
