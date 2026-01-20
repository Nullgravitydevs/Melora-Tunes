# Melora Tunes 🎵

Melora Tunes is a premium, nostalgic music experience that blends modern streaming with the tactile joy of physical media.

## Features

### 📼 Studio Deck
A high-fidelity cassette deck simulator.
- **Drag & Drop**: Insert tapes directly into the deck.
- **Realistic Audio**: Satisfying click, clunk, and insert sounds (sourced from real hardware).
- **Visuals**: Spinning reels, VU meters, and warm analog aesthetics.

### 📱 iPod Mode (Classic)
Turn your device into a fully functional iPod Classic.
- **Click Wheel**: Use your mouse wheel or swipe gestures to navigate with momentum.
- **Haptic & Audio Feedback**: Authentic `click.wav` and `clunk.wav` sounds for every interaction.
- **Cover Flow**: Flip through your album art in 3D.
- **Games**: Includes Brick and Music Quiz!

### 📻 Boombox Mode
A fun, portable player experience.
- **Polaroid Library**: Your mixes scattered as polaroid photos. Drag them onto the boombox to play.
- **Presets**: Shuffle and Repeat controls with a retro twist.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build for Desktop (Electron)**:
    ```bash
    npm run electron:build
    ```

## Audio Engine
Melora Tunes uses a bespoke audio hook (`useAudio.ts`) that manages:
- **Zero-latency** playback of UI sounds.
- **Theme-aware** logic (Classic, Dark, Rose Gold, etc.).
- **Smart preloading** for instant feedback.

---
*Created with ❤️ by Melora Tunes Team*
