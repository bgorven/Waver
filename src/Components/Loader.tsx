import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Player from "./Player";
import Waver from "./Waver";
import {
  CrossCorrelation,
  MonoMixer,
  MovingAverage,
  ResampleFFT,
  RhythmExtractor2013,
} from "../essentia";

interface IProps {
  initialData: Float32Array;
  setWaves: (
    waves: {
      data: Float32Array;
      scale: number;
    }[]
  ) => void;
}

const audioCtx = new AudioContext({ sampleRate: 44100 });

const concat = (left: Float32Array, right: Float32Array) => {
  const result = new Float32Array(left.length + right.length);
  result.set(left);
  result.set(right, left.length);
  return result;
};

const RMS = (data: Float32Array) =>
  Math.sqrt(data.map((v) => v * v).reduce((l, r) => l + r) / data.length);

const zoomLevel = [...Array(4).keys()].map((v) => 2 ** (v * 4)).reverse();

const iter = [...Array(512).keys()];

const toRms = (data: Float32Array, bucketSize: number, resultSize: number) => {
  const result = new Float32Array(resultSize);
  for (let i = 0; i < resultSize; i = i + iter.length) {
    result.set(
      iter
        .filter((j) => i + j < resultSize)
        .map((j) =>
          RMS(data.slice(bucketSize * (i + j), bucketSize * (i + j + 1)))
        ),
      i
    );
  }
  return result;
};

const Loader = ({ initialData, setWaves }: IProps) => {
  const [data, setData] = useState(new Float32Array());
  const [wave, setWave] = useState(new Float32Array());
  const [waveList, setWaveList] = useState([] as Float32Array[]);
  const [duration, setDuration] = useState(1);
  const [time, setTime] = useReducer(
    (_: number, t: number) => ((t % duration) / duration) * wave.length,
    0
  );
  const [status, setStatus] = useState(false as string | boolean);
  const [ticks, setTicks] = useState(new Float32Array());
  const [markers, setMarkers] = useState(new Float32Array());
  const [range, setRange] = useState([-1, 1] as [number, number]);
  const [bpm, setBpm] = useState(0);
  const [x, setX] = useReducer(
    (
      state: number[],
      {
        x,
        start,
        clear,
      }: { x: number; start?: boolean; end?: boolean; clear?: boolean }
    ) => (clear ? [] : start ? [x, state[1]] : [state[0], x]),
    []
  );
  const [fineX, setFineX] = useState([0, 0]);
  const [zoomData, setZoomData] = useState([] as Float32Array[]);

  const readFile: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    async (e) => {
      if (!e?.currentTarget?.files || !e?.currentTarget?.files[0]) {
        return;
      }
      const buf = await e.currentTarget.files[0].arrayBuffer();
      setStatus("decoding");
      const decoded = await audioCtx.decodeAudioData(buf);
      let data = decoded.getChannelData(0);
      if (decoded.numberOfChannels > 1) {
        setStatus("mixing");
        data = await MonoMixer(
          decoded.getChannelData(0),
          decoded.getChannelData(1)
        );
      }

      if (decoded.sampleRate !== audioCtx.sampleRate) {
        setStatus("resampling");
        const outSize =
          (data.length * audioCtx.sampleRate) / decoded.sampleRate;
        data = await ResampleFFT(
          data,
          data.length - (data.length % 2),
          outSize - (outSize % 2)
        );
      }

      setData(data);
      setDuration(decoded.length / decoded.sampleRate);
    },
    []
  );

  const processData = useCallback(async () => {
    if (data.length === 0) {
      setWave(new Float32Array());
      setRange([-1, 1]);
      setMarkers(new Float32Array());
      return;
    }
    const rhythm2013 = RhythmExtractor2013(data);
    const bucketSize = data.length / initialData.length;
    setStatus("calculating rms");
    const rms = toRms(data, bucketSize, initialData.length);
    setWave(rms);
    setStatus("calculating range");
    setRange([
      rms.reduce((l, r) => Math.min(l, r), Number.MAX_VALUE),
      rms.reduce((l, r) => Math.max(l, r), Number.MIN_VALUE),
    ]);
    setStatus("finding beats");

    let ticks = (await rhythm2013).ticks;
    setBpm(Math.round((await rhythm2013).bpm));

    setTicks(ticks);
    setMarkers(
      ticks.map(
        (second) => (second * audioCtx.sampleRate * rms.length) / data.length
      )
    );

    setStatus(false);
  }, [initialData, data]);

  useEffect(() => {
    processData();
  }, [data, processData]);

  useEffect(
    () =>
      setFineX([
        (Math.min(...x) * data.length) / initialData.length,
        (Math.max(...x) * data.length) / initialData.length,
      ]),
    [x, data, initialData]
  );

  useEffect(() => {
    if (data.length === 0) {
      setZoomData([]);
      return;
    }
    setZoomData(
      zoomLevel.map((z) =>
        z === 1 ? data : toRms(data, z, Math.floor(data.length / z))
      )
    );
  }, [data]);

  const zoomedWaves = useMemo(
    () =>
      zoomData.map((data, i) => [
        {
          color: "red",
          offset: initialData.length / 2,
          wave: data.slice(
            fineX[1] / zoomLevel[i],
            fineX[1] / zoomLevel[i] + initialData.length / 2
          ),
        },
        {
          color: "blue",
          wave:
            fineX[0] / zoomLevel[i] >= initialData.length / 2
              ? data.slice(
                  fineX[0] / zoomLevel[i] - initialData.length / 2,
                  fineX[0] / zoomLevel[i]
                )
              : concat(
                  initialData.slice(
                    0,
                    initialData.length / 2 - fineX[0] / zoomLevel[i]
                  ),
                  data.slice(0, fineX[0] / zoomLevel[i])
                ),
        },
        {
          wave: concat(
            data.slice(
              fineX[1] / zoomLevel[i] -
                Math.min(
                  initialData.length / 2,
                  (fineX[1] - fineX[0]) / zoomLevel[i]
                ),
              fineX[1] / zoomLevel[i]
            ),
            data.slice(
              fineX[0] / zoomLevel[i],
              fineX[0] / zoomLevel[i] +
                Math.min(
                  initialData.length / 2,
                  (fineX[1] - fineX[0]) / zoomLevel[i]
                )
            )
          ),
        },
      ]),
    [zoomData, fineX, initialData]
  );

  const crop = useCallback(() => {
    const newData = data.slice(
      fineX[0],
      fineX[1] - ((fineX[1] - fineX[0]) % 2)
    );
    setData(newData);
    setDuration(newData.length / audioCtx.sampleRate);
    setX({ x: 0, clear: true });
  }, [data, fineX]);

  const adjust = useMemo(() => {
    let result = [0, 0, 0, data.length];
    ticks
      .map((t) => t * audioCtx.sampleRate)
      .every((m, i) => {
        if (m < fineX[0]) {
          result[0] = m;
        }
        if (m > fineX[0] && !result[1]) {
          result[1] = m;
        }
        if (m < fineX[1]) {
          result[2] = m;
        }
        if (m > fineX[1]) {
          result[3] = m;
          return false;
        }
        return true;
      });
    return result;
  }, [ticks, fineX, data.length]);

  const [fineDrag, setFineDrag] = useState(
    {} as { started: boolean; left: boolean; x: number }
  );
  const setFine = useCallback(
    (
      { x, start, end }: { x: number; start: boolean; end: boolean },
      scale: number
    ) => {
      if (start) {
        setFineDrag({ started: true, left: x < initialData.length / 2, x });
      } else if (fineDrag.started) {
        let newX = fineDrag.left
          ? [fineX[0], fineX[1] + (fineDrag.x - x) * scale]
          : [fineX[0] + (fineDrag.x - x) * scale, fineX[1]];
        if (newX[0] > newX[1]) {
          newX = [newX[1], newX[0]];
        }
        if (newX[0] < 0) {
          newX[0] = 0;
        }
        if (newX[1] >= data.length) {
          newX[1] = data.length - 1;
        }
        setFineX(newX);
        setFineDrag({ started: !end, left: fineDrag.left, x });
      }
    },
    [fineX, fineDrag, setFineDrag, data.length, initialData.length]
  );

  const getWaves = async () => {
    const waves = [];
    const waveList = [];
    const pad = 4;
    const d = new Float32Array(data);

    for (let w = 0; w < 8; ) {
      let size = d.length / 2 ** w++;
      size = size - (size % 2);
      const avg = new Float32Array(size);

      setStatus("averaging wave " + w);
      const count = Math.floor(d.length / size);
      const mod = d.length % size;
      for (let i = 0; i < mod; i++) {
        let sum = 0;
        for (let j = 0; j <= count; j++) {
          const val = d[j * size + i];
          if (!isFinite(val)) {
            console.log(j * size + i);
          }
          sum += val;
        }
        avg[i] = sum / (count + 1);
      }
      for (let i = mod; i < size; i++) {
        let sum = 0;
        for (let j = 0; j < count; j++) {
          const val = d[j * size + i];
          if (!isFinite(val)) {
            console.log(j * size + i);
          }
          sum += val;
        }
        avg[i] = sum / count;
      }

      setStatus("filtering wave " + w);
      const temp = new Float32Array(size + pad * 2);
      temp.set(avg.slice(size - pad));
      temp.set(avg, pad);
      temp.set(avg.slice(0, pad), pad + size);
      const filtered = (
        await MovingAverage(await MovingAverage(temp, pad), pad)
      ).slice(pad * 2, size + pad * 2);

      setStatus("filling wave " + w);
      const full = new Float32Array(d.length);
      for (let i = 0; i < d.length; i++) {
        full[i] = filtered[i % filtered.length];
      }

      setStatus("shifting wave " + w);
      const lag = (
        await CrossCorrelation(d, full, Math.min(size, initialData.length))
      ).reduce(
        (max, v, i) => (max[0] > v || !isFinite(v) ? max : [v, i]),
        [-Infinity, 0]
      );
      const shifted = concat(
        full.slice(full.length - lag[1]),
        full.slice(0, full.length - lag[1])
      );

      for (let i = 0; i < d.length; i++) {
        d[i] = d[i] - shifted[i];
      }

      waveList.push(
        toRms(d, d.length / initialData.length, initialData.length)
      );

      setStatus("resizing wave " + w);
      const resized =
        size <= initialData.length
          ? shifted.slice(0, size)
          : await ResampleFFT(shifted.slice(0, size), size, initialData.length);

      waves.push({ data: resized, scale: size / resized.length });
    }
    setStatus(false);
    setWaves(waves);
    setWaveList(waveList);
  };

  return (
    <>
      <input type="file" onChange={readFile} />
      {!!data.length && (
        <>
          <Player data={data} setTime={setTime} />
          <button onClick={processData}>load</button>
          <button onClick={crop}>crop</button>
          <div>
            <div style={{ position: "relative" }}>
              <div>
                {!!wave.length && (
                  <Waver
                    mode="display"
                    height={100}
                    setX={setX}
                    data={[{ wave }]}
                    range={range}
                    markers={{
                      blue: markers,
                      red: [time],
                      orange: fineX.map(
                        (x) => (x * initialData.length) / data.length
                      ),
                    }}
                  />
                )}
              </div>
              {waveList.map((wave, i) => (
                <div key={i}>
                  {!!wave.length && (
                    <Waver
                      mode="display"
                      height={100}
                      setX={setX}
                      data={[{ wave }]}
                    />
                  )}
                </div>
              ))}
              {x.length === 2 && (
                <>
                  {zoomedWaves.map((data, i) => (
                    <div key={i}>
                      <Waver
                        mode="display"
                        height={100}
                        data={data}
                        range={zoomLevel[i] === 1 ? [-1, 1] : undefined}
                        setX={(x) =>
                          data[2].wave.length === initialData.length &&
                          setFine(x, zoomLevel[i])
                        }
                      />
                    </div>
                  ))}
                  <div>
                    <button onClick={() => setFineX([adjust[0], fineX[1]])}>
                      ⇤
                    </button>

                    <button onClick={() => setFineX([adjust[1], fineX[1]])}>
                      ⇥
                    </button>
                    <button onClick={() => setFineX([fineX[0], adjust[2]])}>
                      ⇤
                    </button>
                    <button onClick={() => setFineX([fineX[0], adjust[3]])}>
                      ⇥
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      <div>
        {status && <p>{status}</p>}
        {!!bpm && <p>{bpm} bpm</p>}
        {false && <button onClick={getWaves}>↓</button>}
      </div>
    </>
  );
};

export default Loader;
