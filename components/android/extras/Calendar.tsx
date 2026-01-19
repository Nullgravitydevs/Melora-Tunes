"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CalendarProps {
    onBack: () => void;
}

export function Calendar({ onBack }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    // Use a direction state for animation: 1 for next, -1 for prev
    const [direction, setDirection] = useState(0);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const today = useMemo(() => new Date(), []);
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    // Calendar generation logic
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Empty slots for start
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    }, [year, month]);

    const changeMonth = useCallback((delta: number) => {
        setDirection(delta);
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + delta);
            return newDate;
        });
    }, []);

    // Wheel navigation
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const customEvent = e as CustomEvent;
            // Debounce or threshold?
            // Let's rely on the wheel "click" feel.
            const dir = customEvent.detail; // 1 or -1
            if (dir !== 0) {
                changeMonth(dir);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') changeMonth(-1);
            if (e.key === 'ArrowRight') changeMonth(1);
        };

        window.addEventListener('ipod-scroll', handleScroll);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('ipod-scroll', handleScroll);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [changeMonth]);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    return (
        <div className="w-full h-full bg-white text-black font-sans flex flex-col overflow-hidden relative">
            {/* Header: Month Year */}
            <div className="h-8 bg-gradient-to-b from-zinc-100 to-zinc-200 border-b border-zinc-300 flex items-center justify-between px-2 shrink-0 z-10 shadow-sm">
                <button
                    onClick={() => changeMonth(-1)}
                    className="p-1 hover:bg-zinc-300 rounded active:scale-95 transition-transform"
                >
                    <ChevronLeft size={14} className="text-zinc-600" />
                </button>
                <div className="font-bold text-sm text-zinc-800">
                    {monthNames[month]} {year}
                </div>
                <button
                    onClick={() => changeMonth(1)}
                    className="p-1 hover:bg-zinc-300 rounded active:scale-95 transition-transform"
                >
                    <ChevronRight size={14} className="text-zinc-600" />
                </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 py-1">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-zinc-400">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 relative overflow-hidden bg-white">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={`${month}-${year}`}
                        custom={direction}
                        initial={{ x: direction * 100 + '%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction * -100 + '%', opacity: 0 }}
                        transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                        className="absolute inset-0 grid grid-cols-7 grid-rows-6 p-1 gap-px bg-zinc-100" // gap-px + bg-zinc-100 creates grid lines
                    >
                        {calendarDays.map((day, i) => {
                            if (!day) return <div key={`empty-${i}`} className="bg-white" />;

                            const isToday = isCurrentMonth && day === today.getDate();
                            const isWeekend = (i % 7 === 0) || (i % 7 === 6); // S or S

                            return (
                                <div
                                    key={day}
                                    className={`relative bg-white flex items-center justify-center text-xs font-medium cursor-default
                                        ${isWeekend ? 'text-zinc-500' : 'text-zinc-900'}
                                    `}
                                >
                                    <div className={`
                                        w-6 h-6 flex items-center justify-center rounded-full
                                        ${isToday ? 'bg-red-500 text-white font-bold shadow-sm' : ''}
                                    `}>
                                        {day}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Fill remaining cells to keep grid structure if needed, or let CSS grid handle empty space */}
                        {Array.from({ length: 42 - calendarDays.length }).map((_, i) => (
                            <div key={`fill-${i}`} className="bg-white" />
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Event List / Detail Placeholder (Classic iPod style) */}
            <div className="h-1/3 border-t border-zinc-300 bg-zinc-50 p-2 overflow-auto">
                {isCurrentMonth && today.getDate() ? (
                    <div className="flex items-start gap-2">
                        <div className="w-1 h-full min-h-[20px] bg-blue-400 rounded-full"></div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-700">Today</p>
                            <p className="text-[10px] text-zinc-500">No events scheduled.</p>
                        </div>
                    </div>
                ) : (
                    <p className="text-[10px] text-zinc-400 text-center mt-2">No events</p>
                )}
            </div>

            <button
                onClick={onBack}
                className="sr-only" // Hidden, accessible via keyboard/handlers
            >
                Back
            </button>
        </div>
    );
}
