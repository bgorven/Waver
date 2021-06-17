import { useState } from "react";
import Player from "./Player";
import Wave from "./Waver";
import essentia from "../essentia";

interface IProps {
  initialData: Float32Array;
}

const audioCtx = new AudioContext();

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState(initialData);
  const [loudness, setLoudness] = useState(initialData);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);

  const readFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    if (!e?.currentTarget?.files || !e?.currentTarget?.files[0]) {
      return;
    }
    const buf = await e.currentTarget.files[0].arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(buf);
    const ess = await essentia;
    let data = decoded.getChannelData(0);
    let vectorData;
    if (decoded.numberOfChannels > 1) {
      vectorData = ess.MonoMixer(
        ess.arrayToVector(decoded.getChannelData(0)),
        ess.arrayToVector(decoded.getChannelData(1))
      ).audio;
      data = ess.vectorToArray(vectorData);
    } else {
      vectorData = ess.arrayToVector(data);
    }

    if (decoded.sampleRate !== audioCtx.sampleRate) {
      vectorData = ess.Resample(
        vectorData,
        decoded.sampleRate,
        audioCtx.sampleRate
      ).signal;
      data = ess.vectorToArray(vectorData);
    }

    setData(data);
    setDuration(decoded.length / decoded.sampleRate);

    const loudnessData = ess.vectorToArray(
      ess.LoudnessEBUR128(vectorData, vectorData).shortTermLoudness
    );
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
        <Player data={data} setTime={setTime} />
      </div>
    )) ||
    null
  );
};

export default Row;
