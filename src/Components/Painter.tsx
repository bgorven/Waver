import { useEffect, useState, useReducer } from "react";
import { MovingAverage, ResampleFFT } from "../essentia";
import Player from "./Player";
import Waver from "./Waver";

interface IProps {
  initialData: Float32Array;
}

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState(new Float32Array());
  const [history, setHistory] = useState([] as Float32Array[]);
  const [histIndex, setHistoryIndex] = useState(0);
  const [render, doRender] = useReducer((r: number) => r + 1, 0);
  const [scale, doSetScale] = useState(1);
  const hz = 44100 / initialData.length;

  const addHistory = (data: Float32Array) => {
    if (data !== history[histIndex]) {
      setHistoryIndex(histIndex + 1);
      setHistory([...history.slice(0, histIndex + 1), data]);
    }
  };

  const back = () => {
    setHistoryIndex(histIndex - 1);
    const histData = history[histIndex - 1];
    if (histData.length != data.length) {
      setScale(histData.length / initialData.length);
    }
    setData(histData);
    doRender();
  };

  const forward = () => {
    setHistoryIndex(histIndex + 1);
    const histData = history[histIndex + 1];
    if (histData.length != data.length) {
      setScale(histData.length / initialData.length);
    }
    setData(histData);
    doRender();
  };

  const setScale = async (scale: number) => {
    if (!isFinite(scale)) {
      return;
    }
    doSetScale(scale);
    if (scale < 1) {
      setData(
        await ResampleFFT(
          data,
          data.length,
          Math.floor((initialData.length * (scale || 1)) / 2) * 2
        )
      );
    } else if (data.length < initialData.length) {
      setData(await ResampleFFT(data, data.length, initialData.length));
    }
  };

  useEffect(() => {
    setData(initialData);
    setHistory([initialData]);
    setHistoryIndex(0);
    doRender();
  }, [initialData]);

  const filter = async () => {
    const size = 4;
    const temp = new Float32Array(data.length + size * 2);
    temp.set(data.slice(data.length - size));
    temp.set(data, size);
    temp.set(data.slice(0, size), size + data.length);
    const result = (
      await MovingAverage(await MovingAverage(temp, size), size)
    ).slice(size * 2);
    setData(result);
    addHistory(result);
    doRender();
  };

  return (
    (data.length && (
      <div>
        <div>
          <Waver
            mode="draw"
            height={100}
            data={data}
            range={[-1, 1]}
            setData={setData}
            addHistory={addHistory}
            render={render}
          />
        </div>
        <div>
          <Player data={data} scale={scale < 1 ? 1 : scale} />
          <button onClick={back} disabled={histIndex <= 0}>
            Undo ({histIndex})
          </button>
          <button onClick={forward} disabled={histIndex >= history.length - 1}>
            Redo ({history.length - histIndex - 1})
          </button>
          <button onClick={filter}>Filter</button>
          <input
            type="range"
            min={-4}
            max={4}
            step="any"
            value={-Math.log2(scale)}
            onChange={(e) => setScale(2 ** -parseFloat(e.currentTarget.value))}
            onMouseUp={() => addHistory(data)}
          />
          <input
            type="number"
            min={0}
            max={44100}
            step="any"
            value={Math.round((10000 * hz) / scale) / 10000}
            onChange={(e) => setScale(hz / parseFloat(e.currentTarget.value))}
            onBlur={() => addHistory(data)}
          />
          Hz
        </div>
      </div>
    )) ||
    null
  );
};

export default Row;
