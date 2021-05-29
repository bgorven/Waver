import React, { useEffect, useState } from "react";
import {
  AudioContext,
  IAudioBufferSourceNode,
  IAudioContext,
} from "standardized-audio-context";

interface IProps {
  data: number[];
}

const audioCtx = new AudioContext();

const Player = ({ data }: IProps) => {
  const [started, start] = useState(false);
  const [source, setSource] = useState(
    null as IAudioBufferSourceNode<IAudioContext> | null
  );

  useEffect(() => {
    var buf = audioCtx.createBuffer(1, data.length, audioCtx.sampleRate);

    const source = audioCtx.createBufferSource();
    setSource(source);

    const channel = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      channel[i] = data[i] * 2 - 1;
    }

    source.buffer = buf;
    source.loop = true;
    source.connect(audioCtx.destination);
    if (started) {
      source.start();
    }
    return () => {
      source.disconnect();
    };
  }, [data, started]);
  return (
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
  );
};

export default Player;
