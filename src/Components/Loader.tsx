import { useState } from "react";
import Player from "./Player";
import Wave from "./Waver";
import * as ess from "../essentia";

interface IProps {
  initialData: Float32Array;
}

const audioCtx = new AudioContext();

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState(initialData);
  const [loudness, setLoudness] = useState(initialData);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [status, setStatus] = useState(false as string | boolean);

  const readFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!e?.currentTarget?.files || !e?.currentTarget?.files[0]) {
      return;
    }
    const buf = await e.currentTarget.files[0].arrayBuffer();
    setStatus("decoding");
    const decoded = await audioCtx.decodeAudioData(buf);
    let data = decoded.getChannelData(0);
    if (decoded.numberOfChannels > 1) {
      setStatus("mixing");
      data = await ess.MonoMixer(
        decoded.getChannelData(0),
        decoded.getChannelData(1)
      );
    }

    if (decoded.sampleRate !== audioCtx.sampleRate) {
      setStatus("resampling");
      data = await ess.ResampleFFT(
        data,
        decoded.sampleRate,
        audioCtx.sampleRate
      );
    }

    setData(data);
    setLoudness(initialData);
    setDuration(decoded.length / decoded.sampleRate);

    setStatus("calculating loudness");
    const loudnessData = (await ess.LoudnessEBUR128(data, data))
      .shortTermLoudness;
    const loudness = new Float32Array(512);
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (const value of loudnessData) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    const bucketSize = loudnessData.length / 512;
    const scale = 1 / (Math.abs(max - min) * bucketSize);
    for (let i = 0; i < loudnessData.length; i++) {
      loudness[Math.floor(i / bucketSize)] = (loudnessData[i] - min) * scale;
    }
    setLoudness(loudness);
    setStatus(false);
  };
  return (
    (data.length && (
      <div>
        <Wave
          mode="display"
          height={100}
          data={loudness}
          currentTime={((time % duration) / duration) * 512}
          range={[0, 1]}
        />
        <input type="file" onChange={readFile} />
        {status && <p>{status}</p>}
        <Player data={data} setTime={setTime} />
      </div>
    )) ||
    null
  );
};

export default Row;
