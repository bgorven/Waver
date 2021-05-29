import React, { useEffect, useState } from "react";
import Player from "./Player";
import Wave from "./Wave";
import FFT from "fft.js";
import Slider from "rc-slider";

interface IProps {
  initialData: number[];
}

const Range = Slider.createSliderWithTooltip(Slider.Range);

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState([] as number[]);
  const [history, setHistory] = useState([] as number[][]);
  const [histIndex, setHistoryIndex] = useState(0);
  const [fft, setFft] = useState(null as FFT | null);
  const [render, setRender] = useState(0);
  const [range, setRange] = useState([0, 8]);

  const addHistory = (data: number[]) => {
    if (data !== history[histIndex]) {
      setHistoryIndex(histIndex + 1);
      setHistory([...history.slice(0, histIndex + 1), data]);
    }
  };

  const back = () => {
    setHistoryIndex(histIndex - 1);
    const histData = history[histIndex - 1];
    setData(histData);
    setRender(render + 1);
  };

  const forward = () => {
    setHistoryIndex(histIndex + 1);
    const histData = history[histIndex + 1];
    setData(histData);
    setRender(render + 1);
  };

  useEffect(() => {
    setData(initialData);
    setHistory([initialData]);
    setHistoryIndex(0);
    setFft(new FFT(initialData.length));
    setRender(render + 1);
  }, [initialData]);

  const filter = () => {
    const out = fft?.createComplexArray();
    fft?.realTransform(out, data);
    out?.fill(0, 0, range[0] * 2);
    out?.fill(0, range[1] * 2);
    const inverse = fft?.createComplexArray();
    fft?.inverseTransform(inverse, out);
    const result = new Array(initialData.length);
    fft?.fromComplexArray(inverse, result);
    let min = result.reduce((l, r) => Math.min(l, r), 1);
    let max = result.reduce((l, r) => Math.max(l, r), 0);
    let mul = 1 / (max - min);
    for (let i = 0; i < result.length; i++) {
      result[i] = (result[i] - min) * mul;
    }
    setData(result);
    addHistory(result);
    setRender(render + 1);
  };

  return (
    (data.length && (
      <div>
        <Wave
          height={100}
          data={data}
          setData={setData}
          addHistory={addHistory}
          render={render}
        />
        <Range min={1} max={data.length} value={range} onChange={setRange} />
        <button onClick={filter}>Filter</button>
        <button onClick={back} disabled={histIndex <= 0}>
          Undo {histIndex}
        </button>
        <button onClick={forward} disabled={histIndex >= history.length - 1}>
          Redo {history.length}
        </button>
        <Player data={data} />
      </div>
    )) ||
    null
  );
};

export default Row;
