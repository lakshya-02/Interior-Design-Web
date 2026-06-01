let whisperPipelinePromise;

function resampleTo16k(samples, sourceRate) {
  if (sourceRate === 16000) return samples;
  const ratio = sourceRate / 16000;
  const length = Math.round(samples.length / ratio);
  const output = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(Math.ceil(sourceIndex), samples.length - 1);
    const weight = sourceIndex - left;
    output[index] = samples[left] * (1 - weight) + samples[right] * weight;
  }

  return output;
}

async function audioBlobToMono16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const context = new AudioContext();
  const audioBuffer = await context.decodeAudioData(arrayBuffer);
  const channels = audioBuffer.numberOfChannels;
  const mono = new Float32Array(audioBuffer.length);

  for (let channel = 0; channel < channels; channel += 1) {
    const data = audioBuffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      mono[index] += data[index] / channels;
    }
  }

  await context.close();
  return resampleTo16k(mono, audioBuffer.sampleRate);
}

async function getWhisperPipeline(onProgress) {
  if (!whisperPipelinePromise) {
    whisperPipelinePromise = import('@huggingface/transformers').then(async ({ pipeline, env }) => {
      env.allowLocalModels = false;
      const options = {
        // q8 currently fails on some ONNX Runtime Web builds with missing QDQ scale tensors.
        // fp32 is larger/slower, but it is much more reliable for a demo microphone flow.
        dtype: 'fp32',
        device: 'wasm',
        progress_callback: onProgress
      };

      try {
        return await pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny.en', options);
      } catch (error) {
        console.warn('Primary Whisper model failed, trying Xenova fallback.', error);
        return pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
          device: 'wasm',
          progress_callback: onProgress
        });
      }
    });
  }

  try {
    return await whisperPipelinePromise;
  } catch (error) {
    whisperPipelinePromise = null;
    throw error;
  }
}

export async function transcribeWithWhisper(blob, onProgress) {
  const audio = await audioBlobToMono16k(blob);
  const transcriber = await getWhisperPipeline(onProgress);
  const result = await transcriber(audio, {
    sampling_rate: 16000,
    chunk_length_s: 30,
    stride_length_s: 5,
    language: 'english',
    task: 'transcribe'
  });
  return String(result?.text || '').trim();
}
