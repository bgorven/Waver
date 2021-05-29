/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";

interface IProps {
  height: number;
  render?: number;
  data: number[];
  setData: (data: number[]) => void;
}

interface IState {
  x: number;
  y: number;
  draw: boolean;
}

function initialRender(
  canvas: HTMLCanvasElement | null,
  { data, height }: IProps
) {
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx && data) {
    canvas.height = height;
    canvas.width = data.length;
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.moveTo(0, height * data[0]);
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(i, height * data[i]);
    }
    ctx.stroke();
  }
}

const endEvents = ["touchend", "touchcancel"];
function draw(
  event:
    | React.MouseEvent<HTMLCanvasElement>
    | React.TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement | null,
  { data, setData, height }: IProps,
  state: IState,
  setState: (state: IState) => void
) {
  if (!canvas) {
    return;
  }

  const draw =
    event.type === "touchstart" ||
    (state.draw && !endEvents.includes(event.type));
  const mousedown = !!("buttons" in event && event.buttons & 1);

  const { left, top } = canvas.getBoundingClientRect();
  const x =
    ("clientX" in event ? event.clientX : event.changedTouches[0]?.clientX) -
    left;
  const y =
    ("clientY" in event ? event.clientY : event.changedTouches[0]?.clientY) -
    top;

  const ctx = canvas.getContext("2d");
  if (
    ctx &&
    ((draw && state.draw) ||
      (mousedown &&
        event.type !== "mouseenter" &&
        !(
          event.type === "mousedown" &&
          (event as React.MouseEvent<HTMLCanvasElement>).button === 1
        )))
  ) {
    const updated = [...data];
    const slope = (y - state.y) / (x - state.x);
    const left = Math.min(x, state.x);
    const start = Math.floor(left);
    const length = Math.min(
      Math.ceil(Math.max(x, state.x) - start),
      data.length - start
    );
    const frac = left - start;
    const startHeight = x < state.x ? y : state.y;
    for (let i = 0; i < length; i++) {
      updated[start + i] = (startHeight + (i - frac) * slope) / height;
    }
    setData(updated);

    ctx.clearRect(start - 2, 0, length + 3, height);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.moveTo(start - 2, data[start - 2] * height);
    ctx.lineTo(start - 1, data[start - 1] * height);
    ctx.lineTo(start, startHeight + -frac * slope);
    ctx.lineTo(start + length - 1, startHeight + (length - 1 - frac) * slope);
    if (start + length < data.length) {
      ctx.lineTo(start + length, data[start + length] * height);
    }
    if (start + length + 1 < data.length) {
      ctx.lineTo(start + length + 1, data[start + length + 1] * height);
    }
    ctx.stroke();
  } else if (event.type === "mouseenter") {
    if (x !== 0 && y !== 0 && x !== data.length && y !== data.length) {
      //Make drawing rapidly across the canvas slightly nicer
      const right = data.length - x;
      const bottom = height - y;
      const min = Math.min(x, y, right, bottom);
      if (min === x) {
        setState({ x: 0, y, draw });
        return;
      } else if (min === right) {
        setState({ x: data.length, y, draw });
        return;
      }
    }
  }
  setState({ x, y, draw });
}

const Wave = (props: IProps) => {
  const [state, setState] = useState({ x: 0, y: 0, draw: false });
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(
    () => initialRender(ref.current, props),
    [props.height, props.data.length, props.render, window.devicePixelRatio]
    // (intentionally ignore contents of data array, watching 'render' prop instead)
  );
  const callback = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => draw(e, ref.current, props, state, setState);

  return (
    <canvas
      ref={ref}
      onMouseDown={callback}
      onMouseMove={callback}
      onMouseUp={callback}
      onMouseOut={callback}
      onMouseEnter={callback}
      onTouchStart={callback}
      onTouchMove={callback}
      onTouchEnd={callback}
      onTouchCancel={callback}
    />
  );
};

export default Wave;
