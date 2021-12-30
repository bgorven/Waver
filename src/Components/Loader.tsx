import { useReducer, useState } from "react";
import Player from "./Player";
import Wave from "./Waver";
import {
  BeatTrackerDegara,
  BeatTrackerMultiFeature,
  MonoMixer,
  ResampleFFT,
  RhythmExtractor,
  RhythmExtractor2013,
  RMS,
} from "../essentia";

interface IProps {
  initialData: Float32Array;
}

const audioCtx = new AudioContext({ sampleRate: 44100 });

const Row = ({ initialData }: IProps) => {
  const [data, setData] = useState(initialData);
  const [wave, setWave] = useState(initialData);
  const [duration, setDuration] = useState(1);
  const [time, setTime] = useReducer(
    (time: number) => ((time % duration) / duration) * initialData.length,
    0
  );
  const [status, setStatus] = useState(false as string | boolean);
  const [markers, setMarkers] = useState(new Float32Array());
  const [range, setRange] = useState([-1, 1] as [number, number]);
  const [algorithm, setAlgo] = useState("RhythmExtractor2013");
  const [bpm, setBpm] = useState(0);

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
    setRange([-1, 1]);
    setMarkers(new Float32Array());
    setDuration(decoded.length / decoded.sampleRate);

    setStatus("calculating rms");
    const bucketSize = data.length / initialData.length;
    const rms = new Float32Array(initialData.length);
    for (let i = 0; i < initialData.length; i++) {
      rms[i] = await RMS(data.slice(bucketSize * i, bucketSize * (i + 1)));
    }
    setWave(rms);
    setRange([
      rms.reduce((l, r) => Math.min(l, r), Number.MAX_VALUE),
      rms.reduce((l, r) => Math.max(l, r), Number.MIN_VALUE),
    ]);
    setStatus("Finding beats");

    let ticks: Float32Array;
    switch (algorithm) {
      case "BeatTrackerDegara":
        ticks = (await BeatTrackerDegara(data)).ticks;
        break;
      case "BeatTrackerMultiFeature":
        ticks = (await BeatTrackerMultiFeature(data)).ticks;
        break;
      case "RhythmExtractor":
        const rhythm = await RhythmExtractor(data);
        ticks = rhythm.ticks;
        setBpm(rhythm.bpm);
        break;
      case "RhythmExtractor2013":
      default:
        const rhythm2013 = await RhythmExtractor2013(data);
        ticks = rhythm2013.ticks;
        setBpm(rhythm2013.bpm);
        break;
    }

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
          currentTime={time}
          markers={markers}
          range={range}
        />
        <input type="file" onChange={readFile} />
        {bpm || undefined} {(bpm && "bpm") || undefined}
        <select
          value={algorithm}
          onChange={(e) => setAlgo(e.currentTarget.value)}
        >
          <option value="BeatTrackerDegara">BeatTrackerDegara</option>
          <option value="BeatTrackerMultiFeature">
            BeatTrackerMultiFeature
          </option>
          <option value="RhythmExtractor">RhythmExtractor</option>
          <option value="RhythmExtractor2013">RhythmExtractor2013</option>
        </select>
        {status && <p>{status}</p>}
        <Player data={data} setTime={setTime} />
      </div>
    )) ||
    null
  );
};

export default Row;
