
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    delayDuration?: number; // Alias for delay for Radix-ui/shadcn compatibility
    className?: string;
}

export function Tooltip({ text, children, position = 'top', delay = 0.2, delayDuration, className = '' }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const targetDelay = delayDuration !== undefined ? delayDuration / 1000 : delay;

    const getPositionStyles = () => {
        switch (position) {
            case 'top': return { bottom: '100%', left: '50%', x: '-50%', mb: 2 };
            case 'bottom': return { top: '100%', left: '50%', x: '-50%', mt: 2 };
            case 'left': return { right: '100%', top: '50%', y: '-50%', mr: 2 };
            case 'right': return { left: '100%', top: '50%', y: '-50%', ml: 2 };
            default: return { bottom: '100%', left: '50%', x: '-50%', mb: 2 };
        }
    };

    const pos = getPositionStyles();

    return (
        <div
            className={`relative flex items-center justify-center ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, ...pos }}
                        animate={{ opacity: 1, scale: 1, ...pos }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15, delay: targetDelay }}
                        style={{
                            position: 'absolute',
                            [position === 'top' ? 'marginBottom' : position === 'bottom' ? 'marginTop' : position === 'left' ? 'marginRight' : 'marginLeft']: '8px',
                            zIndex: 50,
                            whiteSpace: 'nowrap'
                        }}
                        className="pointer-events-none px-2 py-1 bg-neutral-900 border border-white/10 text-white/80 text-[10px] font-medium rounded shadow-xl backdrop-blur-sm"
                    >
                        {text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
