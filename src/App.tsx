import { useState, useRef } from 'react';

export default function App() {
  const [volume, setVolume] = useState(1); // 1 = 100%
  const [isLooping, setIsLooping] = useState(true);
  const [loopCount, setLoopCount] = useState(3);
  const [speechText, setSpeechText] = useState('');
  const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
  const audioContextRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Record<string, AudioBuffer>>({});
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode | OscillatorNode>>(new Set());

  const sounds = [
    { id: 'beep', name: 'Beep', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { id: 'warning', name: 'Warning', url: 'https://video-idea.fra1.cdn.digitaloceanspaces.com/beeps/warning.mp3', color: 'bg-amber-500 hover:bg-amber-600' },
    { id: 'severe', name: 'Severe Warning', url: 'https://video-idea.fra1.cdn.digitaloceanspaces.com/beeps/freesound_community-severe-warning-alarm-98704.mp3', color: 'bg-red-600 hover:bg-red-700' },
    { id: 'alarm', name: 'Alarm Loop', url: 'https://video-idea.fra1.cdn.digitaloceanspaces.com/beeps/audley_fergine-warning-alarm-loop-1-279206%20(1).mp3', color: 'bg-orange-600 hover:bg-orange-700' },
    { id: 'warning2', name: 'Warning 2', url: 'https://video-idea.fra1.cdn.digitaloceanspaces.com/beeps/wefgf-warning-423632.mp3', color: 'bg-rose-500 hover:bg-rose-600' },
  ];

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

  const stopAll = () => {
    window.speechSynthesis.cancel();
    activeSourcesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Source might have already stopped or not started
      }
    });
    activeSourcesRef.current.clear();
  };

  const loadSound = async (id: string, url: string) => {
    const ctx = await initAudioContext();
    if (buffersRef.current[id]) return buffersRef.current[id];

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    buffersRef.current[id] = audioBuffer;
    return audioBuffer;
  };

  const playSound = async (soundId: string) => {
    const ctx = await initAudioContext();
    const sound = sounds.find(s => s.id === soundId);
    if (!sound) return;

    let buffer: AudioBuffer | null = null;
    let duration = 0.6;

    if (sound.url) {
      buffer = await loadSound(sound.id, sound.url);
      duration = buffer.duration + 0.1;
    }

    const playInstance = (startTime: number) => {
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, startTime);
      gainNode.connect(ctx.destination);

      let source: AudioBufferSourceNode | OscillatorNode;

      if (sound.id === 'beep') {
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, startTime);
        oscillator.connect(gainNode);
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.5);
        source = oscillator;
      } else if (buffer) {
        const bufferSource = ctx.createBufferSource();
        bufferSource.buffer = buffer;
        bufferSource.connect(gainNode);
        bufferSource.start(startTime);
        source = bufferSource;
      } else {
        return;
      }

      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
      };
    };

    if (isLooping) {
      for (let i = 0; i < loopCount; i++) {
        playInstance(ctx.currentTime + i * duration);
      }
    } else {
      playInstance(ctx.currentTime);
    }
  };

  const speakText = () => {
    if (!speechText.trim()) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.volume = Math.min(volume, 1); // SpeechSynthesis volume is 0 to 1
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    
    let selectedVoice = null;
    if (voiceGender === 'female') {
      selectedVoice = englishVoices.find(v => 
        v.name.toLowerCase().includes('female') || 
        v.name.toLowerCase().includes('zira') || 
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('google us english')
      ) || englishVoices[0];
    } else {
      selectedVoice = englishVoices.find(v => 
        v.name.toLowerCase().includes('male') || 
        v.name.toLowerCase().includes('david') || 
        v.name.toLowerCase().includes('alex') ||
        v.name.toLowerCase().includes('google uk english male')
      ) || englishVoices[1] || englishVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Soundboard</h1>
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {sounds.map((sound) => (
            <button
              key={sound.id}
              onClick={() => playSound(sound.id)}
              className={`w-full text-white font-semibold py-4 px-2 rounded-xl transition-colors text-sm ${sound.color}`}
            >
              {sound.name}
            </button>
          ))}
        </div>

        <button
          onClick={stopAll}
          className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl mb-6 transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/></svg>
          STOP ALL
        </button>
        
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
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mb-8"
        />

        <div className="border-t border-slate-100 pt-6">
          <label className="block text-sm font-semibold text-slate-900 mb-3 uppercase tracking-wider">
            Text to Speech
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setVoiceGender('female')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest ${voiceGender === 'female' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Female Voice
              </button>
              <button 
                onClick={() => setVoiceGender('male')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest ${voiceGender === 'male' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Male Voice
              </button>
            </div>
            <textarea
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="Type something to speak..."
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-24"
            />
            <button
              onClick={speakText}
              disabled={!speechText.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              SPEAK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
