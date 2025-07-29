# 🎙️ YouTongue — videos in your language.

**YouTongue** is a desktop Electron app for automatic downloading, translation, and voiceover of YouTube videos.

---

## ⚡ What YouTongue Does

- Downloads videos from YouTube (`youtube-dl-exec`)
- Translates and voiceovers speech using neural voices (`vot-cli` / Yandex SpeechKit)
- Injects the new audio track via `ffmpeg`
- Saves the final video to a user-selected folder
- Exports subtitles in `.srt` and `.vtt` formats
- Supports **multi-threaded processing** — paste multiple links at once
- Accepts a `.txt` file with a list of channels or videos
- Lets you choose the target language for translation and voiceover
- Supports **Russian**, **English**, and **Kazakh**
- Includes both light and dark themes
- Features a minimalist and intuitive interface

---

## 🧩 How It Works

- Paste a link to a YouTube video, channel, or a .txt file with links.
- The app downloads the video, extracts the audio, and translates the speech.
- Neural voiceover is generated for the selected language.
- Ffmpeg replaces the original audio track with the new one.
- Final output: localized video + .srt and .vtt subtitle files.

---

## 🧠 Why It Matters

YouTongue is a powerful tool for:

- Fast localization of YouTube content
- Translating educational videos, interviews, reviews, and media
- Automating media workflows
- Content marketing and multi-platform distribution

---

## 🖥️ Features

- 🎞️ Playlist & channel support ✅
- 📂 Custom output directory ✅
- 🧵 Multi-link input (batch processing) ✅
- 📄 .txt file support for bulk links ✅
- 🌍 Language selection for voiceover ✅
- 🧠 Neural voiceover in 3 languages ✅
- 💬 Subtitles export: .srt, .vtt ✅
- 🎨 Light & dark theme support ✅
- 🖼️ Minimalist and intuitive interface ✅

## 🚀 Installation & Launch

> ⚠️ Binary builds (`.exe`) are not included due to GitHub file size limits. Run the app from source.

## 1. Clone the repository

```bash
git clone https://github.com/amad3i/YouTongue.git
cd YouTongue
```

## 2. Download and add vot-cli

Place the vot-cli folder next to src/ in the root of the project:
```
YouTongue/
├── src/
└── vot-cli/ ← place here
```
## 3. Install dependencies

```bash
npm install
```

## 4. Start the app

```bash
npm start
```

