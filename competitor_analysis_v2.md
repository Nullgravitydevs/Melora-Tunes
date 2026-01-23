# Competitor Analysis: Hi-Fi & Lossless Capabilities
*Date: 2026-01-22*

Per your request, I performed a "Deep Code Audit" on the following repositories to understand their Hi-Fi implementation and extract any keys/logic.

## 📊 Summary Findings

| App Name | Hi-Res / FLAC Streaming? | Source / Engine | Keys / Endpoints Found? | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **streamed.app** | ✅ **YES** (Excellent) | Tidal + Qobuz Proxies | Shared Public Proxies (7) | **Gold Standard**. Logic ported to Melora. |
| **SpotiFLAC** | ✅ **YES** (Excellent) | Tidal + Qobuz | **Found `triton` + Qobuz keys** | Best source for keys. Integrated. |
| **SuvMusic** | ❌ NO (Max 320kbps) | JioSaavn + YouTube | None (Uses Standard APIs) | Good app, but not HiFi. |
| **TheMusicApp** | ❌ NO | Standard Sources | None | Generic player. |
| **high-tide** | ❓ Scripts | Python Helpers | n/a | No direct playback engine found. |
| **hifi** | ❌ Error | Repo Dead/Private | n/a | Could not clone. |

---

## 🕵️‍♂️ Detailed Breakdown

### 1. streamed.app (The "Reference Implementation")
This is the most sophisticated open-source implementation.
*   **How it works:** It uses a list of "Public Tidal Proxies" (e.g., `hund.qqdl.site`, `tidal.kinoplus.online`).
*   **The Secret Sauce:** It handles **DASH Manifests**. When Tidal returns a complex `.mpd` file (common for Hi-Res), standard players fail. Streamed.app extracts the `initialization` segment to get the full audio file.
*   **Melora Update:** I have **ported this DASH parsing logic** into your `lib/hifi.ts`. You now have parity with this engine.

### 2. SpotiFLAC-Mobile (The "Key Vault")
*   **How it works:** Similar proxy approach.
*   **The Secret Sauce:** It contained a unique endpoint `triton.squid.wtf` and specific Qobuz App IDs that others missed.
*   **Melora Update:** I integrated these keys. You now have **more mirrors** than `streamed.app`.

### 3. SuvMusic
*   **Analysis:** I inspected `DownloadRepository.kt`.
*   **Findings:** It uses `JioSaavnRepository` with a hardcoded `320` kbps quality limit.
    ```kotlin
    // From SuvMusic Source
    jioSaavnRepository.getStreamUrl(song.id, 320)
    ```
*   **Conclusion:** It is a high-quality 320kbps downloader, but **not** a Lossless/FLAC streamer. It scans for local FLACs but doesn't download them from Tidal.

### 4. TheMusicApp
*   **Analysis:** Standard Flutter/Android music player structure.
*   **Findings:** No references to "Tidal", "Qobuz", or "Manifest" handling. Likely a UI wrapper for YouTube/Spotify SDKs.

### 5. hifi (sachinsenal0x64)
*   **Status:** The repository URL returns 404/Private. I could not access the source code.

---

## 🚀 Melora's Current Engine Status

After this audit, Melora's Hi-Fi Engine (`lib/hifi.ts`) is now a **"Super-Hybrid"**:

1.  **Endpoints**: 8 Mirrors (Union of `streamed.app` + `SpotiFLAC` lists).
2.  **Logic**: Robust DASH Parsing (from `streamed.app`).
3.  **Fallback**: Auto-downgrade to 320kbps if Lossless fails (Custom logic).
4.  **Qobuz**: Best-in-class `dab.yeet.su` proxy configuration.

**You are theoretically running the most capable open-source HiFi engine available right now.**
