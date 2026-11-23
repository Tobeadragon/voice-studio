import express from 'express'
import multer from 'multer'
import dotenv from 'dotenv'
import FormData from 'form-data'

dotenv.config()

const app = express()
const upload = multer({ storage: multer.memoryStorage() })
const port = process.env.PORT || 3001

app.post('/api/convert-voice', upload.single('audio'), async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID

  if (!apiKey || !voiceId) {
    res.status(500).json({ error: 'APIキーまたはVoice IDが設定されていません。' })
    return
  }

  if (!req.file) {
    res.status(400).json({ error: '音声ファイルが見つかりません。' })
    return
  }

  try {
    const form = new FormData()
    form.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'recording.webm',
      contentType: req.file.mimetype || 'audio/webm',
    })
    form.append('model_id', 'eleven_multilingual_sts_v2')
    form.append(
      'voice_settings',
      JSON.stringify({
        stability: 0.65,
        similarity_boost: 0.75,
        style: 0.15,
      })
    )

    const apiUrl = `https://api.elevenlabs.io/v1/speech-to-speech/${voiceId}`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        ...form.getHeaders(),
      },
      body: form.getBuffer() as unknown as BodyInit,
    })

    if (!response.ok) {
      const errorText = await response.text()
      res.status(response.status).json({ error: `ElevenLabs API Error: ${errorText}` })
      return
    }

    const arrayBuffer = await response.arrayBuffer()
    res.setHeader('Content-Type', 'audio/mpeg')
    res.send(Buffer.from(arrayBuffer))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '音声変換処理に失敗しました。' })
  }
})

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`)
})