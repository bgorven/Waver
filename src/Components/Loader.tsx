import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import Player from "./Player";
import Waver from "./Waver";
import { MonoMixer, ResampleFFT, RhythmExtractor2013, RMS } from "../essentia";

interface IProps {
  initialData: Float32Array;
}

const audioCtx = new AudioContext({ sampleRate: 44100 });

const concat = (left: Float32Array, right: Float32Array) => {
  const result = new Float32Array(left.length + right.length);
  result.set(left);
  result.set(right, left.length);
  return result;
};

const zoomLevel = [...Array(3).keys()].map((v) => 2 ** (v * 6)).reverse();

const iter = [...Array(512).keys()];

const toRms = async (
  data: Float32Array,
  bucketSize: number,
  resultSize: number
) => {
  const result = new Float32Array(resultSize);
  for (let i = 0; i < resultSize; i = i + iter.length) {
    result.set(
      await Promise.all(
        iter
          .filter((j) => i + j < resultSize)
          .map((j) =>
            RMS(data.slice(bucketSize * (i + j), bucketSize * (i + j + 1)))
          )
      ),
      i
    );
  }
  return result;
};

const Loader = ({ initialData }: IProps) => {
  const [data, setData] = useState(new Float32Array());
  const [wave, setWave] = useState(new Float32Array());
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
    const rms = await toRms(data, bucketSize, initialData.length);
    setWave(rms);
    setStatus("calculating range");
    setRange([
      rms.reduce((l, r) => Math.min(l, r), Number.MAX_VALUE),
      rms.reduce((l, r) => Math.max(l, r), Number.MIN_VALUE),
    ]);
    setStatus("finding beats");

    let ticks = (await rhythm2013).ticks;
    setBpm((await rhythm2013).bpm);

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
    Promise.all(
      zoomLevel.map((z) =>
        z === 1 ? data : toRms(data, z, Math.floor(data.length / z))
      )
    ).then(setZoomData);
  }, [data]);

  const zoomedWaves = useMemo(
    () =>
      zoomData.map((data, i) => [
        {
          color: "red",
          offset: initialData.length / 2,
          wave: data.slice(
            fineX[1] / zoomLevel[i],
            fineX[1] / zoomLevel[i] +
              Math.min(
                initialData.length / 2,
                (fineX[1] - fineX[0]) / zoomLevel[i]
              )
          ),
        },
        {
          color: "blue",
          wave: data.slice(
            fineX[0] / zoomLevel[i] -
              Math.min(
                initialData.length / 2,
                (fineX[1] - fineX[0]) / zoomLevel[i]
              ),
            fineX[0] / zoomLevel[i]
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
    [zoomData, fineX, initialData.length]
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
    ({ x, start, end }: { x: number; start: boolean; end: boolean }) => {
      if (start) {
        setFineDrag({ started: true, left: x < initialData.length / 2, x });
      } else if (fineDrag.started) {
        let newX = fineDrag.left
          ? [fineX[0], fineX[1] - (fineDrag.x - x)]
          : [fineX[0] - (fineDrag.x - x), fineX[1]];
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
      }
    },
    [fineX, fineDrag, setFineDrag, data.length, initialData.length]
  );

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
              {x.length === 2 && (
                <>
                  {zoomedWaves.map((data, i) => (
                    <div key={i}>
                      <Waver
                        mode="display"
                        height={100}
                        data={data}
                        range={zoomLevel[i] === 1 ? [-1, 1] : undefined}
                        setX={zoomLevel[i] === 1 ? setFine : undefined}
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
        {bpm || undefined} {(bpm && "bpm") || undefined}
      </div>
    </>
  );
};

export default Loader;
