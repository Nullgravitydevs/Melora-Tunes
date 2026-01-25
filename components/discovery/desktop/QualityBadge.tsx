import React, { useState } from "react";
import { motion } from "framer-motion";

const qualityTooltips: any = {
    'hires': { title: '🔥 Hi-Res Studio Quality', desc: 'LOSSLESS · HI-RES · 24-bit / 96kHz' },
    'flac': { title: '💿 CD Quality Lossless', desc: 'LOSSLESS · CD · 16-bit / 44.1kHz' },
    '320': { title: '🎶 High-Quality Streaming', desc: 'HQ · 320 kbps' },
    '160': { title: '🎵 Standard Streaming', desc: 'MQ · 160 kbps' },
    '96': { title: '📻 Data Saver', desc: 'LQ · 96 kbps' },
};

export function QualityBadge({ quality }: { quality: string }) {
    const norm = quality?.toLowerCase().trim() || '320';
    let q = '160';
    if (norm.includes('hires') || norm.includes('24bit') || norm.includes('master')) q = 'hires';
    else if (norm.includes('flac') || norm.includes('lossless') || norm === 'cd') q = 'flac';
    else if (norm === '320' || norm.includes('hq') || norm.includes('high')) q = '320';
    else if (norm === '96' || norm.includes('lq')) q = '96';
    else if (norm === '160' || norm.includes('mq')) q = '160';
    const info = qualityTooltips[q];
    const [show, setShow] = useState(false);

    return (
        <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded cursor-help ${q === 'hires' || q === 'flac' ? 'bg-white text-black' : 'bg-white/10 text-white/70'} `}>
                {q === 'hires' ? 'HI-RES' : q === 'flac' ? 'FLAC' : q === '320' ? 'HQ' : 'MQ'}
            </span>
            {/* Tooltip */}
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-gray-900 border border-white/10 rounded-xl p-3 shadow-2xl z-50 backdrop-blur-xl"
                >
                    <p className="text-white font-bold text-xs mb-1">{info.title}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{info.desc}</p>
                </motion.div>
            )}
        </div>
    );
}
