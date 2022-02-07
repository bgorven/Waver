import { useEffect, useState } from "react";
import {
  AudioContext,
  IAudioBufferSourceNode,
  IAudioContext,
  IGainNode,
} from "standardized-audio-context";
import { ResampleFFT } from "../essentia";
import audioEncoder from "audio-encoder";
import { saveAs } from "file-saver";

interface IProps {
  data: Float32Array;
  setTime?: (time: number) => void;
  scale?: number;
  gain?: number;
}

const audioCtx = new AudioContext({ sampleRate: 44100 });

const Player = ({ data, scale, gain, setTime }: IProps) => {
  const [started, start] = useState(false);
  const [source, setSource] = useState(
    null as IAudioBufferSourceNode<IAudioContext> | null
  );
  const [gainNode, setGainNode] = useState(
    null as IGainNode<IAudioContext> | null
  );

  useEffect(() => {
    if (!gain) return;
    let g = gainNode;
    if (!g) {
      g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      setGainNode(g);
    } else {
      g.gain.setValueAtTime(gain, audioCtx.currentTime);
    }
  }, [gain, gainNode]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const promise = (async () => {
      let resampled;
      if (!scale || scale === 1) {
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

      if (gainNode) {
        source.connect(gainNode);
      } else {
        source.connect(audioCtx.destination);
      }
      const startTime = audioCtx.currentTime;
      if (started) {
        source.start(startTime);
      }

      if (setTime) {
        interval = setInterval(
          () => started && setTime(audioCtx.currentTime - startTime),
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
  }, [data, started, scale, gainNode, setTime]);

  return (
    <>
      <button
        disabled={!source}
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
        {started ? "pause" : "play"}
      </button>
      <button
        disabled={!source}
        onClick={() => {
          source && audioEncoder(source.buffer, null, null, saveAs);
        }}
      >
        save
      </button>
    </>
  );
};

export default Player;
