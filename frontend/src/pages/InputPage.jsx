import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { AudioWaveform, Mic, Pause, PenSquare, Play } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

const steps = ['1. Data', '2. Analysis', '3. Action']

function getSupportedAudioMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]

  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || ''
}

function writeString(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}

function audioBufferToWavBlob(audioBuffer) {
  const channels = 1
  const sampleRate = audioBuffer.sampleRate
  const pcm = audioBuffer.getChannelData(0)
  const bytesPerSample = 2
  const blockAlign = channels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = pcm.length * bytesPerSample

  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < pcm.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, pcm[i]))
    const sample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    view.setInt16(offset, sample, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

async function convertRecordedBlobToWav(blob) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    throw new Error('AudioContext is not supported in this browser.')
  }

  const context = new AudioContextClass()
  try {
    const source = await blob.arrayBuffer()
    const decoded = await context.decodeAudioData(source.slice(0))
    return audioBufferToWavBlob(decoded)
  } finally {
    await context.close()
  }
}

function SliderField({ label, min, max, value, onChange, step = 0.1 }) {
  return (
    <label className="block rounded-xl border border-[#0369A1]/15 bg-white p-4">
      <div className="mb-3 flex items-center justify-between text-sm font-medium text-[#1E293B]/80">
        <span>{label}</span>
        <span className="rounded-md bg-[#0369A1]/8 px-2 py-1 text-[#0369A1]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="clinical-range"
      />
    </label>
  )
}

function InputPage() {
  const navigate = useNavigate()
  const [screenTime, setScreenTime] = useState(7.5)
  const [sedentaryTime, setSedentaryTime] = useState(5.5)
  const [sleepQuality, setSleepQuality] = useState(6.8)
  const [mode, setMode] = useState('text')
  const [textReflection, setTextReflection] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isConvertingAudio, setIsConvertingAudio] = useState(false)
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState('')

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const previewAudioRef = useRef(null)

  const apiBaseUrl = useMemo(() => {
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  }, [])

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [audioPreviewUrl])

  const updateAudioFile = (file) => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
    }
    setAudioFile(file)
    setAudioPreviewUrl(file ? URL.createObjectURL(file) : '')
    setIsPlayingPreview(false)
  }

  const convertSleepQualityToHours = (qualityScore) => {
    return Number((4 + qualityScore * 0.6).toFixed(1))
  }

  const startRecording = async () => {
    setError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = getSupportedAudioMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        try {
          setIsConvertingAudio(true)
          const recordedBlob = new Blob(chunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          })
          const wavBlob = await convertRecordedBlobToWav(recordedBlob)
          const wavFile = new File([wavBlob], `sukoon-recording-${Date.now()}.wav`, {
            type: 'audio/wav',
          })
          updateAudioFile(wavFile)
          toast.success('Recording ready for review.')
        } catch (conversionError) {
          console.error(conversionError)
          setError('Unable to convert recording to WAV. Please try again.')
          toast.error('Audio conversion failed. Please record again.')
        } finally {
          setIsConvertingAudio(false)
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
          }
        }
      }

      recorder.start()
      setIsRecording(true)
      toast.success('Recording started.')
    } catch (recordError) {
      console.error(recordError)
      setError('Microphone permission is required to record audio.')
      toast.error('Microphone access denied.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording()
      return
    }
    startRecording()
  }

  const togglePreviewPlayback = async () => {
    if (!previewAudioRef.current || !audioPreviewUrl) {
      return
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause()
      return
    }

    try {
      await previewAudioRef.current.play()
      setIsPlayingPreview(true)
    } catch (playError) {
      console.error(playError)
      toast.error('Unable to play this recording.')
    }
  }

  const handleAnalyze = async () => {
    setError('')
    setIsAnalyzing(true)

    if (mode === 'text' && !textReflection.trim()) {
      const message = 'Please provide your text reflection before analysis.'
      setError(message)
      toast.error(message)
      setIsAnalyzing(false)
      return
    }

    if (mode === 'vocal' && !audioFile) {
      const message = 'Please record or upload an audio sample for vocal analysis.'
      setError(message)
      toast.error(message)
      setIsAnalyzing(false)
      return
    }

    try {
      const requestBody = new FormData()
      requestBody.append('screen_time', String(screenTime))
      requestBody.append('sedentary_time', String(sedentaryTime))
      requestBody.append('sleep_hours', String(convertSleepQualityToHours(sleepQuality)))
      requestBody.append('user_text', textReflection.trim() || 'Voice-based check-in requested by the user.')

      if (mode === 'vocal' && audioFile) {
        requestBody.append('audio_file', audioFile, audioFile.name)
      }

      const response = await fetch(`${apiBaseUrl}/analyze`, {
        method: 'POST',
        body: requestBody,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.detail || 'Unable to process analysis request')
      }

      const normalizedPayload = {
        ...payload,
        escalation_required: Boolean(payload?.escalation_required ?? payload?.gemini_insight?.escalation),
      }

      sessionStorage.setItem('sukoon_latest_analysis', JSON.stringify(normalizedPayload))

      const historyEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        stress_index: Number(normalizedPayload.stress_index || 0),
        screen_time: Number(screenTime || 0),
        sedentary_time: Number(sedentaryTime || 0),
        sleep_hours: Number(convertSleepQualityToHours(sleepQuality) || 0),
        burnout_status: normalizedPayload.burnout_status || 'Low',
        escalation_required: normalizedPayload.escalation_required,
        result: normalizedPayload,
      }

      const existingHistory = JSON.parse(localStorage.getItem('sukoon_history') || '[]')
      const nextHistory = [historyEntry, ...existingHistory].slice(0, 50)
      localStorage.setItem('sukoon_history', JSON.stringify(nextHistory))

      toast.success('Analysis Successful!')
      if (['Moderate', 'Critical'].includes(normalizedPayload.burnout_status || '')) {
        toast('Micro-movement Recommended!')
      }

      navigate('/dashboard', {
        state: {
          analysis: normalizedPayload,
          sourceInput: {
            screenTime,
            sedentaryTime,
            sleepQuality,
            mode,
          },
        },
      })
    } catch (submitError) {
      const message = submitError.message || 'Unable to analyze at the moment.'
      setError(message)
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen bg-[#F8FAFC] px-6 py-10 text-[#1E293B]"
    >
      <section className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-[#0369A1]/18 bg-white p-6 shadow-[0_20px_40px_rgba(3,105,161,0.08)] md:p-8">
          <div className="mb-7">
            <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-[#0369A1]/80">
              {steps.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#0369A1]/15">
              <div className="h-full w-1/3 rounded-full bg-[#0369A1]" />
            </div>
          </div>

          <h1 className="text-3xl font-semibold md:text-4xl">Digital Check-in</h1>
          <p className="mt-2 text-[#1E293B]/75">Share your daily digital load to generate a clinical-grade vitality scan.</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SliderField label="Screen Time (0-16 hrs)" min={0} max={16} value={screenTime} onChange={setScreenTime} />
            <SliderField label="Sedentary Time (0-12 hrs)" min={0} max={12} value={sedentaryTime} onChange={setSedentaryTime} />
            <SliderField label="Sleep Quality (0-10)" min={0} max={10} value={sleepQuality} onChange={setSleepQuality} />
          </div>

          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`rounded-2xl border p-5 text-left transition ${
                mode === 'text'
                  ? 'border-[#0369A1] bg-[#0369A1]/6'
                  : 'border-[#0369A1]/20 bg-white hover:border-[#0369A1]/40'
              }`}
            >
              <PenSquare className="mb-3 text-[#0369A1]" size={20} />
              <h2 className="text-lg font-semibold">Text Reflection</h2>
              <p className="mt-1 text-sm text-[#1E293B]/75">Write a focused summary of your present mental state.</p>
            </button>

            <button
              type="button"
              onClick={() => setMode('vocal')}
              className={`rounded-2xl border p-5 text-left transition ${
                mode === 'vocal'
                  ? 'border-[#0369A1] bg-[#0369A1]/6'
                  : 'border-[#0369A1]/20 bg-white hover:border-[#0369A1]/40'
              }`}
            >
              <Mic className="mb-3 text-[#0369A1]" size={20} />
              <h2 className="text-lg font-semibold">Vocal Analysis</h2>
              <p className="mt-1 text-sm text-[#1E293B]/75">Use a short voice sample to assess strain and fatigue biomarkers.</p>
            </button>
          </section>

          {mode === 'text' ? (
            <div className="mt-5 rounded-2xl border border-[#0369A1]/20 bg-[#F8FAFC] p-4">
              <textarea
                rows={5}
                value={textReflection}
                onChange={(event) => setTextReflection(event.target.value)}
                placeholder="Describe your cognitive load, mood, and energy pattern today."
                className="w-full resize-y rounded-xl border border-[#0369A1]/30 bg-white p-3 outline-none focus:border-[#0369A1]"
              />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#0369A1]/20 bg-[#F8FAFC] p-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isConvertingAudio}
                  className={`record-button ${isRecording ? 'is-recording' : ''}`}
                >
                  <AudioWaveform size={18} />
                  {isRecording ? 'Stop' : 'Record'}
                </button>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#0369A1]/25 bg-white px-3 py-2 text-sm font-medium text-[#1E293B]">
                  Upload audio
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => updateAudioFile(event.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>

                {audioPreviewUrl && (
                  <button
                    type="button"
                    onClick={togglePreviewPlayback}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#0369A1]/30 bg-white px-3 py-2 text-sm font-semibold text-[#0369A1]"
                  >
                    {isPlayingPreview ? <Pause size={16} /> : <Play size={16} />}
                    {isPlayingPreview ? 'Pause' : 'Play'}
                  </button>
                )}

                <span className="text-sm text-[#1E293B]/70">
                  {audioFile ? audioFile.name : 'No audio selected'}
                </span>
              </div>

              {isRecording && (
                <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#EF4444]">
                  <span className="recording-dot" />
                  Recording...
                </p>
              )}

              {isConvertingAudio && (
                <p className="mt-3 text-xs text-[#1E293B]/60">Converting recording to WAV format...</p>
              )}

              {audioPreviewUrl && (
                <audio
                  ref={previewAudioRef}
                  src={audioPreviewUrl}
                  onEnded={() => setIsPlayingPreview(false)}
                  onPause={() => setIsPlayingPreview(false)}
                  className="mt-3 w-full"
                  controls
                />
              )}

              <p className="mt-3 text-xs text-[#1E293B]/60">
                Record, stop, then use Play to review before analysis.
              </p>
            </div>
          )}

          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isConvertingAudio || isRecording}
              className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-[#0369A1] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#03537d] disabled:cursor-not-allowed disabled:opacity-80"
            >
              {isAnalyzing ? (
                <>
                  <span className="medical-spinner" />
                  Scanning Biomarkers...
                </>
              ) : (
                'Analyze'
              )}
            </button>
            {isAnalyzing && (
              <p className="text-sm text-[#1E293B]/70">Processing your profile with clinical safeguards...</p>
            )}
          </div>
        </div>
      </section>
    </motion.main>
  )
}

export default InputPage
