import { useState } from "react";
import Player from "./Player";
import Wave from "./Waver";
import { MonoMixer, ResampleFFT, RhythmExtractor2013, RMS } from "../essentia";

interface IProps {
  initialData: Float32Array;
}

const audioCtx = new AudioContext();

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState(initialData);
  const [wave, setWave] = useState(initialData);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [status, setStatus] = useState(false as string | boolean);
  const [markers, setMarkers] = useState(new Float32Array());

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
      data = await MonoMixer(
        decoded.getChannelData(0),
        decoded.getChannelData(1)
      );
    }

    if (decoded.sampleRate !== audioCtx.sampleRate) {
      setStatus("resampling");
      data = await ResampleFFT(data, decoded.sampleRate, audioCtx.sampleRate);
    }

    setData(data);
    setWave(initialData);
    setMarkers(new Float32Array());
    setDuration(decoded.length / decoded.sampleRate);

    setStatus("calculating rms");
    const bucketSize = data.length / initialData.length;
    const rms = new Float32Array(initialData.length);
    for (let i = 0; i < initialData.length; i++) {
      rms[i] = await RMS(data.slice(bucketSize * i, bucketSize * (i + 1)));
    }
    setWave(rms);
    setStatus("Finding beats");

    const ticks = (await RhythmExtractor2013(data)).ticks;

    setMarkers(
      ticks.map(
        (second) =>
          (second * audioCtx.sampleRate * initialData.length) / data.length
      )
    );

    setStatus(false);
  };
  return (
    (data.length && (
      <div>
        <Wave
          mode="display"
          height={100}
          data={wave}
          currentTime={((time % duration) / duration) * initialData.length}
          markers={markers}
          range={[
            wave.reduce((l, r) => Math.min(l, r), Number.MAX_VALUE),
            wave.reduce((l, r) => Math.max(l, r), Number.MIN_VALUE),
          ]}
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
