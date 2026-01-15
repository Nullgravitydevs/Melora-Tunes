"use client";

import { motion } from "framer-motion";

interface SearchKeyboardProps {
    selectedIndex: number;
}

export const KEYBOARD_CHARS = [
    'A', 'B', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'J', 'K', 'L',
    'M', 'N', 'O', 'P', 'Q', 'R',
    'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', '0', '1', '2', '3',
    '4', '5', '6', '7', '8', '9',
    'SPACE', 'BKSP', 'DONE'
];

export function SearchKeyboard({ selectedIndex }: SearchKeyboardProps) {
    return (
        <div className="grid grid-cols-6 gap-1 p-2 bg-black w-full">
            {KEYBOARD_CHARS.map((char, index) => {
                const isSelected = index === selectedIndex;
                const isWide = char.length > 1;

                return (
                    <div
                        key={char}
                        className={`
                            h-8 flex items-center justify-center rounded text-[10px] font-bold transition-all
                            ${isWide ? 'col-span-2 text-[9px]' : ''}
                            ${isSelected
                                ? 'bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.6)] scale-105 z-10 border border-blue-400'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'}
                        `}
                    >
                        {char === 'SPACE' ? '␣' : char === 'BKSP' ? '⌫' : char}
                    </div>
                );
            })}
        </div>
    );
}
