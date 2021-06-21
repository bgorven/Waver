const handler = URL.createObjectURL(
  new Blob([
    `
var baseUrl = "https://cdn.jsdelivr.net/npm/essentia.js@0.1.0/dist/";
importScripts(
  baseUrl + "essentia-wasm.web.js",
  baseUrl + "essentia.js-core.js"
);
var doFetch = fetch;
function fetchFn() {
  return doFetch(...[baseUrl + arguments[0], ...Array.from(arguments).slice(1)]);
}
fetch = fetchFn;
var document = {};
var essentia = EssentiaWASM().then(wasm => new Essentia(wasm));
essentia.then(e => e.ResampleFFT(e.arrayToVector(new Float32Array(512)), 512, 1024))
onmessage = async function(e) {
  const ess = await essentia;
  const args = e.data[1].map((value) => {
    if (value instanceof Float32Array) {
      return ess.arrayToVector(value);
    }
    return value;
  });
  const result = ess[e.data[0]].apply(ess, args);
  for (let key of Object.keys(result)) {
    if (result[key].constructor.name === 'VectorFloat') {
      result[key] = ess.vectorToArray(result[key]);
    }
  }
  postMessage(result);
}`,
  ])
);

const handlers: [(value: unknown) => any, (value: unknown) => any][] = [];
const err = [
  (value: unknown) => {
    throw new Error("No handler found for success");
  },
  (value: unknown) => {
    throw new Error("No handler found for error");
  },
];
const worker = new Worker(handler);
worker.onmessage = (value) => (handlers.shift() || err)[0](value);
worker.onerror = (value) => (handlers.shift() || err)[1](value);
const essentia: { [id: string]: (...args: any[]) => Promise<any> } = new Proxy(
  {},
  {
    get: (target, prop, receiver) => {
      return (...args: any[]) => {
        worker.postMessage([prop, args]);
        return new Promise((resolve, reject) =>
          handlers.push([resolve, reject])
        ).then((value: any) => {
          return value.data || {};
        });
      };
    },
  }
);

/**
 * This algorithm resamples the input signal to the desired sampling rate.
 * See https://essentia.upf.edu/reference/std_Resample.html
 */
export async function Resample(
  signal: Float32Array,
  inputSampleRate?: number,
  outputSampleRate?: number,
  quality?: number
): Promise<Float32Array> {
  return (
    await essentia.Resample(signal, inputSampleRate, outputSampleRate, quality)
  ).signal;
}
/**
 * This algorithm resamples a sequence using FFT / IFFT. The input and output sizes must be an even number.
 * See https://essentia.upf.edu/reference/std_ResampleFFT.html
 */
export async function ResampleFFT(
  signal: Float32Array,
  inSize?: number,
  outSize?: number
): Promise<Float32Array> {
  return (await essentia.ResampleFFT(signal, inSize, outSize)).output;
}
/**
 * This algorithm implements a FIR Moving Average filter.
 * See https://essentia.upf.edu/reference/std_MovingAverage.html
 */
export async function MovingAverage(
  signal: Float32Array,
  size?: number
): Promise<Float32Array> {
  return (await essentia.MovingAverage(signal, size)).signal;
}
/**
 * This algorithm computes the median filtered version of the input signal giving the kernel size as detailed in https://en.wikipedia.org/wiki/Median_filter.
 * See https://essentia.upf.edu/reference/std_MedianFilter.html
 */
export async function MedianFilter(
  array: Float32Array,
  kernelSize?: number
): Promise<Float32Array> {
  return (await essentia.MedianFilter(array, kernelSize)).filteredArray;
}
/**
 * This algorithm downmixes the signal into a single channel given a stereo signal.
 * See https://essentia.upf.edu/reference/std_MonoMixer.html
 */
export async function MonoMixer(
  leftSignal: Float32Array,
  rightSignal: Float32Array
): Promise<Float32Array> {
  return (await essentia.MonoMixer(leftSignal, rightSignal)).audio;
}
/**
 * This algorithm computes the EBUR128 loudness descriptors of an audio signal.
 * See https://essentia.upf.edu/reference/std_LoudnessEBUR128.html
 */
export async function LoudnessEBUR128(
  leftSignal: Float32Array,
  rightSignal: Float32Array,
  hopSize?: number,
  sampleRate?: number,
  startAtZero?: boolean
): Promise<{
  momentaryLoudness: Float32Array;
  shortTermLoudness: Float32Array;
  integratedLoudness: number;
  loudnessRange: number;
}> {
  return await essentia.LoudnessEBUR128(
    leftSignal,
    rightSignal,
    hopSize,
    sampleRate,
    startAtZero
  );
}
export async function RMS(data: Float32Array): Promise<number> {
  return (await essentia.RMS(data)).rms;
}

export async function RhythmExtractor2013(
  signal: Float32Array,
  maxTempo?: number,
  method?: string,
  minTempo?: number
): Promise<{
  bpm: number;
  ticks: Float32Array;
  confidence: number;
  estimates: Float32Array;
  bpmIntervals: Float32Array;
}> {
  return await essentia.RhythmExtractor2013(signal, maxTempo, method, minTempo);
}
