import React, { useEffect, useState } from "react";
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
}

const audioCtx = new AudioContext();

const Player = ({ data }: IProps) => {
  const [started, start] = useState(false);
  const [source, setSource] = useState(
    null as IAudioBufferSourceNode<IAudioContext> | null
  );
  const [scale, setScale] = useState(1);

  useEffect(() => {
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
      if (started) {
        source.start();
      }
      return source;
    })();
    return () => {
      promise.then((source) => source.disconnect());
    };
  }, [data, started, scale]);
  return (
    <>
      <button
        onClick={() => {
          if (started) {
            start(false);
            source?.stop();
          } else {
            start(true);
            source?.start();
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
