import React from "react";
import { motion } from "framer-motion";

export function WaveLoader() {
    return (
        <div className="flex items-center gap-1.5 h-6">
            {[1, 2, 3].map(i => (
                <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                        boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 10px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0)']
                    }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}
