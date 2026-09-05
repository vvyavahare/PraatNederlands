# PraatNederlands 🇳🇱🗣️
**Interactieve AI Nederlands B1–B2 Spraak- & Conversatietrainer**

PraatNederlands is an advanced interactive Dutch language learning platform designed specifically for intermediate learners (NT2 Staatsexamen B1–B2) and international professionals preparing for job interviews, municipal registrations, and daily life in the Netherlands.

Powered by **Google Gemini AI**, **Web Speech API**, **Express**, **React 19**, **TypeScript**, and **Tailwind CSS**, PraatNederlands combines conversational voice interactions with a dedicated **Grammatica & Correctie Studio** for real-time grammar diffs, word order checks (inversion, subclauses), and B2 vocabulary upgrades.

---

## ✨ Key Features

- 🎙️ **Continuous Speech Recognition**: Natural Dutch voice recording with manual "Stop & Evaluate" control — take your time without accidental pauses cutting you off.
- 🗣️ **Native Dutch Audio Synthesis**: Listen to high-fidelity Dutch speech (e.g., Bram de Vries, Engineering Manager) with adjustable playback speeds (0.8x, 0.9x, 1.0x).
- 🔍 **Live Correctie Studio**: Side-by-side linguistic analysis featuring:
  - Exact word-for-word error diffs (*Wat je zei* vs. *Correct Nederlands*)
  - Clear grammatical explanations (de/het articles, separable verbs, inversie, bijzin woordvolgorde)
  - Native B2 sentence upgrades
  - Pronunciation tips & common mistakes
- 🏢 **Immersive Dutch Scenarios**:
  - *IT Sollicitatiegesprek bij FinTech Amsterdam* met Bram de Vries (Engineering Manager)
  - *Afspraak bij de Gemeente* (BSN registratie, vestiging)
  - *Huisartsbezoek & Gezondheid* (klachten omschrijven)
  - *Woningzoektocht & Huurcontract*
- ⚡ **Resilient Architecture**: Full server-side Gemini AI processing with smart offline fallback heuristics ensuring the app always functions even without an API key.
- 🏆 **Gamified Progress**: Earn XP, build daily streaks, and track CEFR B1–B2 grammar mastery.

---

## 📋 Prerequisites

Before running the project locally, ensure you have:

1. **Node.js**: Version `18.0.0` or higher (`20.x` or `22.x` recommended)
   - Check with: `node -v`
2. **npm**: Version `9.x` or higher (comes with Node.js)
   - Check with: `npm -v`
   - *Alternatively, you can use `yarn`, `pnpm`, or `bun`.*
3. **Browser**: Google Chrome, Microsoft Edge, or Brave (recommended for Web Speech Recognition and Speech Synthesis APIs).
4. **Google Gemini API Key** *(Optional but recommended for full AI evaluation)*:
   - Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).
   - *Note: PraatNederlands includes built-in Dutch grammar evaluation rules, so the app will still function in offline/fallback mode if no API key is provided.*

---

## 🚀 Step-by-Step Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/vvyavahare/PraatNederlands.git
cd PraatNederlands
```

### 2. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file to create your local `.env` configuration:

```bash
cp .env.example .env
```

Open `.env` in your code editor and configure your variables:

```env
# Gemini API Key for AI Dutch Tutor evaluations
GEMINI_API_KEY="your_actual_gemini_api_key_here"

# Server Port (default: 3000)
PORT="3000"
NODE_ENV="development"
```

> **Note**: PostgreSQL and Redis variables in `.env` are optional. If omitted, PraatNederlands automatically uses its built-in, zero-dependency in-memory store for instant local execution.

### 4. Start the Development Server

Run the development server with live reload:

```bash
npm run dev
```

This starts the unified Express + Vite development server at:
👉 **[http://localhost:3000](http://localhost:3000)**

Open this URL in Google Chrome or Microsoft Edge.

---

## 🎙️ Using Microphone & Audio

1. When you first open the app, your browser will prompt for **Microphone Permission**. Click **Allow**.
2. Click the large orange **Microphone** button to start speaking Dutch.
3. Speak at your own pace! The continuous listener will keep recording as you speak.
4. When you finish your sentence, click **"Stop opname & Evalueer"** to submit, or **"Stop & Bewerk tekst"** if you'd like to inspect or tweak the transcript before sending.
5. Bram de Vries will respond in spoken Dutch, and your grammar analysis will appear instantly in the **Correctie Studio** on the right!

---

## 📦 Production Build & Deployment

### Build and Run Locally

To create an optimized production bundle:

```bash
# 1. Compile frontend client and server
npm run build

# 2. Start the production server
npm start
```

### Docker Deployment

A `Dockerfile` is included for containerized environments:

```bash
# Build Docker image
docker build -t praatnederlands:latest .

# Run Docker container
docker run -p 3000:3000 -e GEMINI_API_KEY="your_api_key" praatnederlands:latest
```

Navigate to `http://localhost:3000`.

---

## 🛠️ Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs backend server with Vite middleware via `tsx` on port 3000 |
| **Build** | `npm run build` | Builds Vite frontend into `dist/` and bundles `server.ts` into `dist/server.cjs` |
| **Start** | `npm start` | Runs the compiled production server (`node dist/server.cjs`) |
| **Lint** | `npm run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| **Clean** | `npm run clean` | Cleans build artifacts (`dist/`) |

---

## 📂 Project Structure

```text
PraatNederlands/
├── server.ts                  # Express server entry point with Vite middleware
├── server/
│   ├── controllers/           # API handlers for conversations, audio, users
│   ├── routes/                # REST endpoints (/api/conversation, /api/user, etc.)
│   ├── services/              # Gemini AI Tutor service, Postgres & Redis abstractions
│   └── data/                  # Scenario definitions (IT Interview, Gemeente, etc.)
├── src/
│   ├── App.tsx                # Main application component & layout
│   ├── main.tsx               # React 19 client entry point
│   ├── components/            # UI components (VoiceChatInterface, Metrics, Scenarios)
│   ├── lib/
│   │   ├── speech.ts          # SpeechRecognition & SpeechSynthesis service
│   │   └── api.ts             # Client-side API client
│   └── types.ts               # Shared TypeScript data models
├── public/                    # Static assets (favicons, manifest, icons)
├── .env.example               # Environment variables template
├── Dockerfile                 # Multi-stage Docker build configuration
├── package.json               # Dependencies and build scripts
└── tsconfig.json              # TypeScript compiler configuration
```

---

## ❓ Frequently Asked Questions & Troubleshooting

### Why is microphone not picking up my voice?
- Make sure you are using **Chrome, Edge, or Brave**.
- Check that microphone permission is set to "Allow" for `http://localhost:3000` (click the tune/lock icon in the URL bar).
- Ensure your OS audio input settings have the correct microphone selected.

### Can I run the app without a Gemini API Key?
Yes! The application features a robust offline linguistic evaluation engine that checks Dutch inversion, common B1/B2 errors, and scenario-specific conversational flows. However, providing a `GEMINI_API_KEY` unlocks dynamic, context-aware AI conversation and tailored B2 phrasing.

---

## 📄 License

This project is licensed under the MIT License.
Veel succes met het leren van Nederlands! 🇳🇱🚀
