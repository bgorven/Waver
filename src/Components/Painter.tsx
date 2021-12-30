import { useEffect, useState, useReducer } from "react";
import { MovingAverage } from "../essentia";
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
  const [scale, setScale] = useState(1);
  const hz = 44100 / data.length;

  const addHistory = (data: Float32Array) => {
    if (data !== history[histIndex]) {
      setHistoryIndex(histIndex + 1);
      setHistory([...history.slice(0, histIndex + 1), data]);
    }
  };

  const back = () => {
    setHistoryIndex(histIndex - 1);
    const histData = history[histIndex - 1];
    setData(histData);
    doRender();
  };

  const forward = () => {
    setHistoryIndex(histIndex + 1);
    const histData = history[histIndex + 1];
    setData(histData);
    doRender();
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
          <Player data={data} scale={scale} />
          <button onClick={back} disabled={histIndex <= 0}>
            Undo ({histIndex})
          </button>
          <button onClick={forward} disabled={histIndex >= history.length - 1}>
            Redo ({history.length - histIndex - 1})
          </button>
          <button onClick={filter}>Filter</button>
          <input
            type="range"
            min={1}
            max={100}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.currentTarget.value))}
          />
          <input
            type="number"
            min={hz}
            max={100 * hz}
            value={scale * hz}
            onChange={(e) => setScale(parseFloat(e.currentTarget.value) / hz)}
          />
          Hz
        </div>
      </div>
    )) ||
    null
  );
};

export default Row;
