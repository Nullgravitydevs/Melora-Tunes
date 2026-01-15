import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-sans)", "Inter", "sans-serif"],
                mono: ["var(--font-mono)", "Share Tech Mono", "monospace"],
                display: ['"Press Start 2P"', 'cursive'],
                hand: ['"Courier Prime"', 'monospace'],
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))'
                },
                retro: {
                    black: "#1a1a1a",
                    gray: "#2d2d2d",
                    white: "#e0e0e0",
                    blue: "#00d8ff",
                    purple: "#9933ff",
                },
                // Deck Studio Colors
                player: {
                    body: "#f8fafc",
                    screen: "#1e1e1e",
                    lcd: "#9ca3af",
                    button: "#2563eb",
                },
                tape: {
                    purple: "#8b5cf6",
                    orange: "#f97316",
                    dark: "#1f2937",
                },
                zen: {
                    primary: "#d97706",
                    bg: { light: "#fcfbf9", dark: "#1c1917" },
                    surface: { light: "#ffffff", dark: "#292524" },
                    cassette: { cream: "#f5f5f4", purple: "#8b5cf6" }
                },
                nordic: {
                    primary: "#3b82f6", // Clean glowing blue
                    bg: "#1a1c20", // Deep matte charcoal
                    surface: "#24272b", // Lighter charcoal
                    light: "#f0f2f5", // Light grey
                    silver: "#9ca3af", // Metallic silver
                },

            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            }
        }
    },
    plugins: [
        typography,
    ],
};
export default config;
