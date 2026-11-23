<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const isRecording = ref(false)
const isConverting = ref(false)
const errorMessage = ref<string | null>(null)

const originalAudioUrl = ref<string | null>(null)
const convertedAudioUrl = ref<string | null>(null)
const recordedBlob = ref<Blob | null>(null)

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

const startRecording = async () => {
  errorMessage.value = null
  convertedAudioUrl.value = null

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data)
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' })
      recordedBlob.value = blob
      if (originalAudioUrl.value) URL.revokeObjectURL(originalAudioUrl.value)
      originalAudioUrl.value = URL.createObjectURL(blob)
      stream.getTracks().forEach((track) => track.stop())
    }

    mediaRecorder.start()
    isRecording.value = true
  } catch {
    errorMessage.value = 'マイクへのアクセスが許可されませんでした。'
  }
}

const stopRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  errorMessage.value = null
  convertedAudioUrl.value = null
  recordedBlob.value = file

  if (originalAudioUrl.value) URL.revokeObjectURL(originalAudioUrl.value)
  originalAudioUrl.value = URL.createObjectURL(file)
}

const convertVoice = async () => {
  if (!recordedBlob.value) return

  isConverting.value = true
  errorMessage.value = null

  try {
    const formData = new FormData()
    formData.append('audio', recordedBlob.value, 'input-audio.webm')

    const res = await fetch('/api/convert-voice', {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '音声の変換に失敗しました。')
    }

    const resultBlob = await res.blob()
    if (convertedAudioUrl.value) URL.revokeObjectURL(convertedAudioUrl.value)
    convertedAudioUrl.value = URL.createObjectURL(resultBlob)
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'エラーが発生しました。'
  } finally {
    isConverting.value = false
  }
}

onUnmounted(() => {
  if (originalAudioUrl.value) URL.revokeObjectURL(originalAudioUrl.value)
  if (convertedAudioUrl.value) URL.revokeObjectURL(convertedAudioUrl.value)
})
</script>

<template>
  <main style="max-width: 640px; margin: 2rem auto; font-family: sans-serif; padding: 0 1rem;">
    <h1>AI Voice Tone Studio (Vite)</h1>
    <p>録音または音声ファイルをアップロードして、落ち着いたトーンに変換します。</p>

    <section style="border: 1px solid #ddd; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
      <h2>1. 音声の用意</h2>
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <button v-if="!isRecording" @click="startRecording" style="padding: 0.6rem 1.2rem; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">
          ● 録音開始
        </button>
        <button v-else @click="stopRecording" style="padding: 0.6rem 1.2rem; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer;">
          ■ 録音停止
        </button>
        <input type="file" accept="audio/*" @change="handleFileUpload" />
      </div>

      <div v-if="originalAudioUrl" style="margin-top: 1rem;">
        <p style="font-size: 0.9rem; color: #555; margin-bottom: 0.3rem;">元の音声:</p>
        <audio :src="originalAudioUrl" controls style="width: 100%;"></audio>
      </div>
    </section>

    <section v-if="recordedBlob" style="margin-bottom: 1.5rem;">
      <button
        @click="convertVoice"
        :disabled="isConverting"
        style="width: 100%; padding: 0.8rem; background: #059669; color: white; font-size: 1rem; border: none; border-radius: 6px; cursor: pointer;"
      >
        {{ isConverting ? 'AIで声質を変換中...' : '落ち着いた男性ボイスに変換する' }}
      </button>
    </section>

    <p v-if="errorMessage" style="color: #dc2626; background: #fef2f2; padding: 0.8rem; border-radius: 6px;">
      {{ errorMessage }}
    </p>

    <section v-if="convertedAudioUrl" style="border: 2px solid #059669; padding: 1.5rem; border-radius: 8px; background: #f0fdf4;">
      <h2>2. 変換後の音声</h2>
      <audio :src="convertedAudioUrl" controls style="width: 100%; margin-bottom: 1rem;"></audio>
      <a
        :href="convertedAudioUrl"
        download="converted-voice.mp3"
        style="display: inline-block; padding: 0.6rem 1.2rem; background: #111827; color: white; text-decoration: none; border-radius: 6px;"
      >
        MP3ファイルをダウンロード
      </a>
    </section>
  </main>
</template>
