interface VectorFloat {}

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
}
