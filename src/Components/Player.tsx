import { useEffect, useState } from "react";
import {
  AudioContext,
  IAudioBufferSourceNode,
  IAudioContext,
} from "standardized-audio-context";
import Slider from "rc-slider";
import essentia from "../essentia";

const Scale = Slider.createSliderWithTooltip(Slider);

interface IProps {
  data: Float32Array;
  setTime?: (time: number) => void;
}

const audioCtx = new AudioContext();

const Player = ({ data, setTime }: IProps) => {
  const [started, start] = useState(false);
  const [source, setSource] = useState(
    null as IAudioBufferSourceNode<IAudioContext> | null
  );
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const promise = (async () => {
      let resampled;
      if (scale === 1) {
        resampled = data;
      } else {
        const ess = await essentia;
        resampled = ess.vectorToArray(
          ess.Resample(
            ess.arrayToVector(data),
            data.length,
            data.length * scale
          ).signal
        );
      }
      const buf = audioCtx.createBuffer(
        1,
        resampled.length,
        audioCtx.sampleRate
      );

      const source = audioCtx.createBufferSource();
      setSource(source);

      buf.copyToChannel(resampled, 0);

      source.buffer = buf;
      source.loop = true;
      source.connect(audioCtx.destination);
      const startTime = audioCtx.currentTime;
      if (started) {
        source.start(startTime);
      }

      if (started && setTime) {
        interval = setInterval(
          () => setTime(audioCtx.currentTime - startTime),
          1000 / 60
        );
      }

      return source;
    })();
    return () => {
      promise.then((source) => {
        source.disconnect();
        if (setTime) {
          clearInterval(interval);
          setTime(0);
        }
      });
    };
  }, [data, started, scale, setTime]);
  return (
    <>
      <button
        onClick={() => {
          if (started) {
            start(false);
            source?.stop();
          } else {
            start(true);
            try {
              source?.start();
            } catch (e) {
              console.log(e);
            }
          }
        }}
      >
        {started ? "Stop" : "Play"}
      </button>
      <Scale min={1} max={100} value={scale} onChange={setScale} />
    </>
  );
};

export default Player;
