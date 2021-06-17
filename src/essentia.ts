interface VectorFloat {
  size(): number;
  get(index: number): number;
}

declare const EssentiaExtractor: any;
declare const EssentiaWASM: any;

const essentia: Promise<Essentia> = EssentiaWASM().then(
  (wasm: any) => new EssentiaExtractor(wasm)
);

export default essentia;

declare class Essentia {
  constructor(EssentiaWASM: any, isDebug?: boolean);
  arrayToVector(inputArray: Float32Array): VectorFloat;
  vectorToArray(inputVector: VectorFloat): Float32Array;
  /**
   * This algorithm resamples the input signal to the desired sampling rate.
   * See https://essentia.upf.edu/reference/std_Resample.html
   */
  Resample(
    signal: VectorFloat,
    inputSampleRate?: number,
    outputSampleRate?: number,
    quality?: number
  ): { signal: VectorFloat };
  /**
   * This algorithm resamples a sequence using FFT / IFFT. The input and output sizes must be an even number.
   * See https://essentia.upf.edu/reference/std_ResampleFFT.html
   */
  ResampleFFT(
    signal: VectorFloat,
    inSize?: number,
    outSize?: number
  ): { output: VectorFloat };
  /**
   * This algorithm implements a FIR Moving Average filter.
   * See https://essentia.upf.edu/reference/std_MovingAverage.html
   */
  MovingAverage(signal: VectorFloat, size?: number): { signal: VectorFloat };
  /**
   * This algorithm computes the median filtered version of the input signal giving the kernel size as detailed in https://en.wikipedia.org/wiki/Median_filter.
   * See https://essentia.upf.edu/reference/std_MedianFilter.html
   */
  MedianFilter(
    array: VectorFloat,
    kernelSize?: number
  ): { filteredArray: VectorFloat };
  /**
   * This algorithm downmixes the signal into a single channel given a stereo signal.
   * See https://essentia.upf.edu/reference/std_MonoMixer.html
   */
  MonoMixer(
    leftSignal: VectorFloat,
    rightSignal: VectorFloat
  ): { audio: VectorFloat };
  /**
   * This algorithm computes the EBUR128 loudness descriptors of an audio signal.
   * See https://essentia.upf.edu/reference/std_LoudnessEBUR128.html
   */
  LoudnessEBUR128(
    leftSignal: VectorFloat,
    rightSignal: VectorFloat,
    hopSize?: number,
    sampleRate?: number,
    startAtZero?: boolean
  ): {
    momentaryLoudness: VectorFloat;
    shortTermLoudness: VectorFloat;
    integratedLoudness: number;
    loudnessRange: number;
  };
}
