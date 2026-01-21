import React from 'react';
import { motion } from 'framer-motion';
import { useEqualizer, FREQUENCIES } from '@/hooks/useEqualizer';
import { Power, RotateCcw } from 'lucide-react';

interface EqualizerViewProps {
    onClose: () => void;
    // We pass the actual control functions from context usually, 
    // but for now we'll use the hook internally and assume context sync via localstorage/event or prop
    // Actually, the PlaybackContext needs to own the source of truth to pass to AudioPlayer.
    // So this component should receive props.
    bands: number[];
    setBand: (index: number, gain: number) => void;
    isEnabled: boolean;
    setIsEnabled: (enabled: boolean) => void;
    currentPreset: string;
    setPreset: (name: string) => void;
    presets: string[];
}

export const EqualizerView: React.FC<EqualizerViewProps> = ({
    onClose, bands, setBand, isEnabled, setIsEnabled, currentPreset, setPreset, presets
}) => {

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-xl rounded-xl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute top-4 right-4 z-50">
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            <div className="flex items-center justify-between w-full max-w-2xl mb-8 px-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white tracking-tight">EQUALIZER</h2>
                    <button
                        onClick={() => setIsEnabled(!isEnabled)}
                        className={`p-2 rounded-full transition-colors ${isEnabled ? 'bg-green-500 text-black' : 'bg-white/10 text-white/40'}`}
                    >
                        <Power size={20} />
                    </button>
                </div>

                <div className="flex gap-2">
                    <select
                        value={currentPreset}
                        onChange={(e) => setPreset(e.target.value)}
                        className="bg-white/10 text-white border-none rounded px-3 py-1 cursor-pointer outline-none hover:bg-white/20"
                    >
                        {presets.map(p => <option key={p} value={p} className="bg-black">{p}</option>)}
                        <option value="Custom" className="bg-black">Custom</option>
                    </select>
                </div>
            </div>

            <div className={`grid grid-cols-10 gap-2 md:gap-4 w-full max-w-4xl h-64 md:h-80 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                {bands.map((gain, i) => (
                    <div key={i} className="flex flex-col items-center h-full gap-2 group">
                        <div className="relative flex-grow w-full flex justify-center bg-white/5 rounded-full py-2">
                            {/* Track Line */}
                            <div className="absolute h-full w-1 bg-white/10 rounded-full"></div>

                            {/* Slider Input */}
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="0.5"
                                value={gain}
                                onChange={(e) => setBand(i, parseFloat(e.target.value))}
                                className="z-10 absolute inset-0 w-full h-full opacity-0 cursor-ns-resize appearance-none"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} // Hacky HTML range rotation often easier with custom div
                            />

                            {/* Custom Thumb/Bar Visual */}
                            <div
                                className="absolute bottom-1/2 w-1.5 bg-white rounded-full transition-all group-hover:bg-green-400 group-hover:w-2"
                                style={{
                                    height: `${Math.abs(gain) * (50 / 12)}%`,
                                    transformOrigin: 'bottom',
                                    marginTop: gain >= 0 ? `-${Math.abs(gain) * (50 / 12)}%` : '0',
                                    marginBottom: gain < 0 ? `-${Math.abs(gain) * (50 / 12)}%` : '0',
                                    // This logic is tricky for center-zero. Let's simplify.
                                    // Height from center.
                                }}
                            />

                            {/* Use simple absolute position dot for slider knob */}
                            <div
                                className="absolute w-4 h-4 rounded-full bg-white shadow-lg pointer-events-none transition-transform group-hover:scale-125"
                                style={{
                                    bottom: `${((gain + 12) / 24) * 100}%`,
                                    marginBottom: '-8px' // center
                                }}
                            ></div>
                        </div>
                        <span className="text-[10px] md:text-xs font-mono text-white/50">{FREQUENCIES[i] >= 1000 ? `${FREQUENCIES[i] / 1000}k` : FREQUENCIES[i]}</span>
                        <span className="text-[10px] font-mono text-white/30 h-3">{gain > 0 ? `+${gain}` : gain}</span>
                    </div>
                ))}
            </div>

        </motion.div>
    );
};
