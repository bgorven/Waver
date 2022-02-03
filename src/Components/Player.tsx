import { useEffect, useState } from "react";
import {
  AudioContext,
  IAudioBufferSourceNode,
  IAudioContext,
} from "standardized-audio-context";
import { ResampleFFT } from "../essentia";

interface IProps {
  data: Float32Array;
  setTime?: (time: number) => void;
  scale?: number;
}

const audioCtx = new AudioContext({ sampleRate: 44100 });

const Player = ({ data, scale, setTime }: IProps) => {
  const [started, start] = useState(false);
  const [source, setSource] = useState(
    null as IAudioBufferSourceNode<IAudioContext> | null
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const promise = (async () => {
      let resampled;
      if (scale === 1) {
        resampled = data;
      } else {
        const size = (data.length * (scale || 1)) / 2;
        resampled = await ResampleFFT(data, data.length, Math.floor(size) * 2);
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
      promise
        .then((source) => {
          source.disconnect();
          if (setTime) {
            clearInterval(interval);
            setTime(0);
          }
        })
        .catch(console.log);
    };
  }, [data, started, scale, setTime]);
  return (
    <button
      onClick={() => {
        if (started) {
          source?.stop();
          start(false);
        } else {
          try {
            source?.start();
            start(true);
          } catch (e) {
            console.log(e);
          }
        }
      }}
    >
      {started ? "Stop" : "Play"}
    </button>
  );
};

export default Player;
