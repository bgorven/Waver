const handler = URL.createObjectURL(
  new Blob([
    `
var baseUrl = "https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/";
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
onmessage = async function(e) {
  try {
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
        try {
          result[key] = ess.vectorToArray(result[key]);
        } catch (e) {
          if (e !== "Empty vector input") {
            console.log(e);
            throw e;
          }
          result[key] = new Float32Array();
        }
      }
    }
    postMessage({result});
  } catch (error) {
    postMessage({error});
  }
}`,
  ])
);

const queue: {
  message: [string | symbol, any[]];
  handler: [(value: unknown) => any, (value: unknown) => any];
}[] = [];
const handlers: [(value: unknown) => any, (value: unknown) => any][][] = [];
const workers: Worker[] = [];
const err = [
  (value: unknown) => {
    throw new Error("No handler found for success");
  },
  (value: unknown) => {
    throw new Error("No handler found for error");
  },
];
for (let i = 0; i < 8; i++) {
  const index = i;
  const worker = new Worker(handler);
  worker.onmessage = (value) => {
    const handler = handlers[index].shift() || err;
    if (value.data.result) {
      handler[0](value.data.result);
    } else {
      handler[1](value.data.error);
    }
    const queueItem = queue.shift();
    if (queueItem) {
      workers[index].postMessage(
        queueItem.message,
        queueItem.message[1].filter((v) => v instanceof ArrayBuffer)
      );
      handlers[index].push(queueItem.handler);
    }
  };
  worker.onerror = (value) => {
    (handlers[index].shift() || err)[1](value);
    const queueItem = queue.shift();
    if (queueItem) {
      workers[index].postMessage(
        queueItem.message,
        queueItem.message[1].filter((v) => v instanceof ArrayBuffer)
      );
      handlers[index].push(queueItem.handler);
    }
  };
  workers.push(worker);
  handlers.push([]);
}
const essentia: { [id: string]: (...args: any[]) => Promise<any> } = new Proxy(
  {},
  {
    get: (target, prop, receiver) => {
      return (...args: any[]) => {
        const index = handlers
          .map((h, i) => (h.length === 0 ? i : undefined))
          .find((i) => i !== undefined);
        if (index !== undefined) {
          workers[index].postMessage(
            [prop, args],
            args.filter((v) => v instanceof ArrayBuffer)
          );
          return new Promise((resolve, reject) =>
            handlers[index].push([resolve, reject])
          ).then((value: any) => {
            return value || {};
          });
        } else {
          const queueItem: typeof queue[number] = {
            message: [prop, args],
          } as any;
          queue.push(queueItem as any);
          return new Promise(
            (resolve, reject) => (queueItem["handler"] = [resolve, reject])
          ).then((value: any) => {
            return value || {};
          });
        }
      };
    },
  }
);

/**
 * This algorithm resamples the input signal to the desired sampling rate.
 * See https://essentia.upf.edu/reference/std_Resample.html
 *
 * This algorithm is only supported if essentia has been compiled with Real=float, otherwise it will throw an exception.
 * It may also throw an exception if there is an internal error in the SRC library during conversion.
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
  inSize: number,
  outSize: number
): Promise<Float32Array> {
  if (inSize % 2 || outSize % 2) {
    console.error(`ResampleFFT called with odd values: ${inSize}, ${outSize}`);
  }
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

/**
 * This algorithm estimates the beat positions given an input signal. It computes ‘complex spectral difference’
 * onset detection function and utilizes the beat tracking algorithm (TempoTapDegara) to extract beats [1].
 * The algorithm works with the optimized settings of 2048/1024 frame/hop size for the computation of the detection function,
 * with its posterior x2 resampling.) While it has a lower accuracy than BeatTrackerMultifeature (see the evaluation results in [2]),
 * its computational speed is significantly higher, which makes reasonable to apply this algorithm for batch processings of large amounts of audio signals.
 * See https://essentia.upf.edu/reference/std_BeatTrackerDegara.html
 *
 * Note that the algorithm requires the audio input with the 44100 Hz sampling rate in order to function correctly.
 */
export async function BeatTrackerDegara(
  signal: Float32Array,
  maxTempo?: number,
  minTempo?: number
): Promise<{
  ticks: Float32Array;
}> {
  return await essentia.BeatTrackerDegara(signal, maxTempo, minTempo);
}

/**
 * This algorithm estimates the beat positions given an input signal.
 * It computes a number of onset detection functions and estimates beat location candidates from them using TempoTapDegara algorithm.
 * Thereafter the best candidates are selected using TempoTapMaxAgreement.
 * See https://essentia.upf.edu/reference/std_BeatTrackerMultiFeature.html
 */
export async function BeatTrackerMultiFeature(
  signal: Float32Array,
  maxTempo?: number,
  minTempo?: number
): Promise<{
  ticks: Float32Array;
  confidence: number;
}> {
  return await essentia.BeatTrackerMultiFeature(signal, maxTempo, minTempo);
}

/**
 * This algorithm estimates the tempo in bpm and beat positions given an audio signal.
 * The algorithm combines several periodicity functions and estimates beats using TempoTap and TempoTapTicks.
 * It combines:
 *  - onset detection functions based on high-frequency content (see OnsetDetection)
 *  - complex-domain spectral difference function (see OnsetDetection)
 *  - periodicity function based on energy bands (see FrequencyBands, TempoScaleBands)
 * See https://essentia.upf.edu/reference/std_RhythmExtractor.html
 *
 * Note that this algorithm is outdated in terms of beat tracking accuracy, and it is highly recommended to use RhythmExtractor2013 instead.
 */
export async function RhythmExtractor(signal: Float32Array): Promise<{
  bpm: number;
  ticks: Float32Array;
  estimates: Float32Array;
  bpmIntervals: Float32Array;
}> {
  return await essentia.RhythmExtractor(signal);
}

/**
 * This algorithm extracts the beat positions and estimates their confidence as well as tempo in bpm for an audio signal.
 * The beat locations can be computed using:
 *  - ‘multifeature’, the BeatTrackerMultiFeature algorithm
 *  - ‘degara’, the BeatTrackerDegara algorithm (note that there is no confidence estimation for this method, the output confidence value is always 0)
 * See https://essentia.upf.edu/reference/std_RhythmExtractor2013.html
 *
 * Note that the algorithm requires the sample rate of the input signal to be 44100 Hz in order to work correctly.
 */
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

/**
 * This algorithm computes the autocorrelation vector of a signal. It uses the version most commonly used in signal processing, which doesn’t remove the mean from the observations.
 * Using the ‘generalized’ option this algorithm computes autocorrelation as described in [Tolonen T., and Karjalainen, M. (2000). A computationally efficient multipitch analysis model].
 * See https://essentia.upf.edu/reference/std_AutoCorrelation.html
 */
export async function AutoCorrelation(
  array: Float32Array,
  frequencyDomainCompression?: number,
  generalized?: boolean,
  normalization?: "standard" | "unbiased"
): Promise<Float32Array> {
  return (
    await essentia.AutoCorrelation(
      array,
      frequencyDomainCompression,
      generalized,
      normalization
    )
  ).autoCorrelation;
}

/**
 * This algorithm computes the warped auto-correlation of an audio signal.
 * The implementation is an adapted version of K. Schmidt’s implementation of the matlab algorithm from the ‘warped toolbox’ by Aki Harma and Matti Karjalainen
 * See https://essentia.upf.edu/reference/std_WarpedAutoCorrelation.html
 */
export async function WarpedAutoCorrelation(
  array: Float32Array,
  maxLag?: number,
  sampleRate?: number
): Promise<Float32Array> {
  return (await essentia.AutoCorrelation(array, maxLag, sampleRate))
    .warpedAutoCorrelation;
}

/**
 * This algorithm computes the cross-correlation vector of two signals.
 * It accepts 2 parameters, minLag and maxLag which define the range of the computation of the innerproduct.
 * See https://essentia.upf.edu/reference/std_CrossCorrelation.html
 *
 * An exception is thrown if “minLag” is larger than “maxLag”. An exception is also thrown if the input vectors are empty.
 */
export async function CrossCorrelation(
  arrayX: Float32Array,
  arrayY: Float32Array,
  maxLag?: number,
  minLag?: number
): Promise<Float32Array> {
  if (arrayX.length === 0 || arrayY.length === 0) {
    console.error("CrossCorrelation called with empty array");
  }
  if ((minLag || 0) > (maxLag || 1)) {
    console.error("CrossCorrelation called with invalid lag");
  }
  return (await essentia.CrossCorrelation(arrayX, arrayY, maxLag, minLag))
    .crossCorrelation;
}
