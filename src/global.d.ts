declare module "audio-encoder" {
  export default function audioEncoder(
    buffer: TAnyAudioBuffer,
    bitrate: number | null,
    onProgress: ((fraction: number) => void) | null,
    onComplete: (buffer: Blob) => void
  ): void;
}
