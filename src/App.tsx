import { useState, useRef } from 'react';

export default function App() {
  const [volume, setVolume] = useState(1); // 1 = 100%
  const [isLooping, setIsLooping] = useState(true);
  const [loopCount, setLoopCount] = useState(3);
  const audioContextRef = useRef<AudioContext | null>(null);
  const warningBufferRef = useRef<AudioBuffer | null>(null);

  const initAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  };

  const loadWarningSound = async () => {
    const ctx = await initAudioContext();
    if (warningBufferRef.current) return warningBufferRef.current;

    const response = await fetch('https://video-idea.fra1.cdn.digitaloceanspaces.com/beeps/warning.mp3');
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    warningBufferRef.current = audioBuffer;
    return audioBuffer;
  };

  const playSound = async (type: 'beep' | 'warning') => {
    const ctx = await initAudioContext();
    
    const playInstance = (buffer: AudioBuffer | null, startTime: number) => {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.connect(ctx.destination);

      if (type === 'beep') {
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, startTime);
        oscillator.connect(gainNode);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
      } else if (buffer) {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode);
        source.start(startTime);
      }
    };

    let buffer: AudioBuffer | null = null;
    let duration = 0.6; // Default interval for beep

    if (type === 'warning') {
      buffer = await loadWarningSound();
      duration = buffer.duration + 0.1; // Add a small gap
    }

    if (isLooping) {
      for (let i = 0; i < loopCount; i++) {
        playInstance(buffer, ctx.currentTime + i * duration);
      }
    } else {
      playInstance(buffer, ctx.currentTime);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Soundboard</h1>
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="grid grid-cols-1 gap-4 mb-6">
          <button
            onClick={() => playSound('beep')}
            className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Play Beep
          </button>
          <button
            onClick={() => playSound('warning')}
            className="w-full bg-amber-500 text-white font-semibold py-4 rounded-xl hover:bg-amber-600 transition-colors"
          >
            Play Warning
          </button>
        </div>
        
        <div className="mb-4 flex items-center gap-2">
          <input 
            type="checkbox" 
            id="loop"
            checked={isLooping}
            onChange={(e) => setIsLooping(e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          <label htmlFor="loop" className="text-sm font-medium text-slate-700">Loop</label>
        </div>

        {isLooping && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Number of loops: {loopCount}
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={loopCount}
              onChange={(e) => setLoopCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full p-2 border border-slate-300 rounded-lg"
            />
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-2">
          Volume: {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="3"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>
    </div>
  );
}
