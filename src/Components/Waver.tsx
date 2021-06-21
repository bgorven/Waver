/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from "react";

type IProps = DrawProps | DisplayProps;

interface BaseProps {
  /**
   * Height in pixels.
   */
  height: number;
  /**
   * The wave data, one horizontal pixel will be drawn per item.
   */
  data: Float32Array;
  /**
   * The range of values in the wave data. The first number will be drawn at the
   * bottom of the canvas, so for example [0,1] will render higher values above
   * lower values, while [1,0] would plot the same data upside down.
   */
  range: [number, number];
  /**
   * 'draw': the user can draw on the canvas using a mouse or touch to update the
   * provided data. Changes to the input data will not be rendered unless the height,
   * width (data.length), or `render` property change.
   * 'display': any change to the data or properties will trigger a render. Draw
   * events will not be triggered.
   */
  mode: string;
}

interface DrawProps extends BaseProps {
  /**
   * The user can draw on the canvas using a mouse or touch to update the
   * provided data. Changes to the input data will not be rendered unless the height,
   * width (data.length), or `render` property change. */
  mode: "draw";
  /**
   * When in 'draw' mode, change this to redraw the canvas from the supplied data.
   */
  render?: number;
  /**
   * Callback to update the data array when drawing.
   */
  setData: (data: Float32Array) => void;
  /**
   * Called after drawing is complete.
   */
  addHistory: (data: Float32Array) => void;
}

interface DisplayProps extends BaseProps {
  /**
   * Any change to the data or properties will trigger a render. Draw
   * events will not be triggered.
   */
  mode: "display";
  /**
   * Render a time marker at this horizontal pixel.
   */
  currentTime?: number;
  /**
   * Render a markers at these horizontal pixels.
   */
  markers?: number[] | Float32Array;
}

interface IState {
  x: number;
  y: number;
  draw: boolean;
}

function render(
  canvas: HTMLCanvasElement | null,
  { data, height, range, currentTime, markers }: DisplayProps
) {
  const ctx = canvas?.getContext("2d");
  if (canvas && ctx && data) {
    canvas.height = height;
    canvas.width = data.length;
    const scale = height / (range[1] - range[0]);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.moveTo(0, (range[1] - data[0]) * scale);
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(i, (range[1] - data[i]) * scale);
    }
    ctx.stroke();
    if (markers) {
      for (let marker of markers) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "blue";
        ctx.moveTo(marker, 0);
        ctx.lineTo(marker, height);
        ctx.stroke();
      }
    }
    if (currentTime) {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "red";
      ctx.moveTo(currentTime, 0);
      ctx.lineTo(currentTime, height);
      ctx.stroke();
    }
  }
}

const endEvents = ["touchend", "touchcancel"];
function draw(
  event:
    | React.MouseEvent<HTMLCanvasElement>
    | React.TouchEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement | null,
  { data, range, setData, height, addHistory }: IProps & DrawProps,
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
    const updated = new Float32Array(data);
    const left = Math.min(x, state.x);
    const start = Math.floor(left);
    const length = Math.min(
      Math.ceil(Math.max(x, state.x) - start),
      data.length - start
    );
    const frac = left - start;
    const scale = height / (range[1] - range[0]);
    let startHeight = range[1] - (x <= state.x ? y : state.y) / scale;
    const endHeight = range[1] - (x < state.x ? state.y : y) / scale;
    let slope =
      x === state.x ? 0 : (endHeight - startHeight) / Math.abs(x - state.x);
    for (let i = 0; i < length; i++) {
      updated[start + i] = startHeight + (i - frac) * slope;
    }
    setData(updated);

    startHeight = x <= state.x ? y : state.y;
    slope = x === state.x ? 0 : (y - state.y) / (x - state.x);

    ctx.clearRect(start - 2, 0, length + 3, height);
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.moveTo(start - 2, (range[1] - data[start - 2]) * scale);
    ctx.lineTo(start - 1, (range[1] - data[start - 1]) * scale);
    ctx.lineTo(start, startHeight + -frac * slope);
    ctx.lineTo(start + length - 1, startHeight + (length - 1 - frac) * slope);
    if (start + length < data.length) {
      ctx.lineTo(start + length, (range[1] - data[start + length]) * scale);
    }
    if (start + length + 1 < data.length) {
      ctx.lineTo(
        start + length + 1,
        (range[1] - data[start + length + 1]) * scale
      );
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
  } else {
    addHistory(data);
  }
  setState({ x, y, draw });
}

const Wave = (props: IProps) => {
  const [state, setState] = useState({ x: 0, y: 0, draw: false });
  const ref = useRef<HTMLCanvasElement>(null);
  let deps;
  if (props.mode === "draw") {
    // ignore changes to contents of data array; parent signals change by updating 'render' prop
    deps = [
      props.height,
      props.data.length,
      props.render,
      window.devicePixelRatio,
    ];
  } else {
    deps = [props, window.devicePixelRatio];
  }
  useEffect(() => render(ref.current, props as any), deps);

  let callback;
  if (props.mode === "draw") {
    callback = (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => draw(e, ref.current, props, state, setState);
  }

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
