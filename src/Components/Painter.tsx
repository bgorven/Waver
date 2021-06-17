import { useEffect, useState, useReducer } from "react";
import Player from "./Player";
import Waver from "./Waver";
import essentia from "../essentia";

interface IProps {
  initialData: Float32Array;
}

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState(new Float32Array());
  const [history, setHistory] = useState([] as Float32Array[]);
  const [histIndex, setHistoryIndex] = useState(0);
  const [render, doRender] = useReducer((r: number) => r + 1, 0);

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
    const ess = await essentia;
    const size = 4;
    const temp = new Float32Array(data.length + size * 2);
    temp.set(data.slice(data.length - size));
    temp.set(data, size);
    temp.set(data.slice(0, size), size + data.length);
    const result = ess
      .vectorToArray(
        ess.MovingAverage(
          ess.MovingAverage(ess.arrayToVector(temp), size).signal
        ).signal
      )
      .slice(size * 2);
    setData(result);
    addHistory(result);
    doRender();
  };

  return (
    (data.length && (
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
