# PraatNederlands 🇳🇱🗣️
**Interactieve AI Nederlands B1–B2 Spraak- & Conversatietrainer**

PraatNederlands is an advanced interactive Dutch language learning platform designed specifically for intermediate learners (NT2 Staatsexamen B1–B2) and international professionals preparing for job interviews, municipal registrations, and daily life in the Netherlands.

The repository is organized with distinct folders for **Backend** (`backend/`) and **Frontend** (`frontend/`) within the same GitHub repository:

- ☕ **Backend (`backend/`)**: Built on **Java 25** with **Spring Boot 4.1.0**, **Project Loom Virtual Threads**, an enhanced RAG hybrid vector engine combining semantic embeddings and lexical cosine similarity, and Dutch linguistic grammar analyzers.
- ⚛️ **Frontend (`frontend/`)**: Built on **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**, featuring continuous Dutch speech recognition, live audio synthesis, and the **Correctie Studio**.

---

## 📂 Repository Structure

```text
PraatNederlands/
├── backend/                       # ☕ Java 25 Spring Boot 4.1.0 Enterprise Backend
│   ├── pom.xml                    # Maven configuration (Java 25, Spring Boot 4.1.0, Virtual Threads)
│   ├── mvnw & mvnw.cmd            # Maven wrapper scripts (no pre-installed Maven required)
│   └── src/main/
│       ├── java/com/praatnederlands/
│       │   ├── PraatNederlandsApplication.java   # Spring Boot Application entry point
│       │   ├── config/                           # CORS & Virtual Thread Customizers
│       │   ├── controller/                       # REST Controllers (Conversation, RAG, Learning, Ops)
│       │   ├── model/                            # Immutable Java 25 Records (Turn, Scenario, RAG, etc.)
│       │   └── service/                          # RAG Vector Engine & Gemini AI Dutch Linguistic Service
│       └── resources/
│           └── application.yml                   # Port 8080, Virtual Threads & Gemini configuration
│
├── frontend/                      # ⚛️ React 19 + TypeScript + Vite Frontend
│   ├── package.json               # Frontend dependencies and scripts
│   ├── vite.config.ts             # Vite configuration with proxy to Java backend (http://localhost:8080)
│   ├── index.html                 # HTML5 entry point
│   ├── public/                    # PWA icons, manifest & audio assets
│   └── src/
│       ├── App.tsx                # Application layout & state coordinator
│       ├── components/            # UI components (VoiceChat, RagKnowledgeStudio, CorrectieStudio)
│       ├── lib/                   # Audio synthesis & speech recognition utilities
│       └── types.ts               # Client TypeScript data contracts
│
├── README.md                      # Comprehensive startup & architecture guide
└── .env.example                   # Environment variables template
```

---

## 📋 Prerequisites

Before running the application, make sure you have:

1. **Java 25 JDK** (for Backend):
   - Check with: `java -version`
   - Download: [Oracle JDK 25 Early-Access](https://jdk.java.net/25/) or [Adoptium Eclipse Temurin](https://adoptium.net/)
2. **Node.js 18+ or 20+** (for Frontend):
   - Check with: `node -v` and `npm -v`
3. **Browser**: Google Chrome, Microsoft Edge, or Brave (recommended for Web Speech Recognition and Speech Synthesis APIs).
4. **Google Gemini API Key** *(Optional)*:
   - Obtain a key from [Google AI Studio](https://aistudio.google.com/).
   - *Note: Both the Java 25 backend and the frontend contain built-in Dutch grammar evaluation rules, so the app will still function seamlessly in fallback mode even without an API key.*

---

## 🚀 How to Start the Systems

### ☕ 1. Starting the Java 25 Backend

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. *(Optional)* Set your Gemini API key:
   ```bash
   export GEMINI_API_KEY="your_actual_gemini_api_key_here"
   ```

3. Run the Spring Boot application using the included Maven wrapper:
   ```bash
   # On macOS / Linux:
   ./mvnw spring-boot:run

   # On Windows (cmd or PowerShell):
   mvnw.cmd spring-boot:run
   ```

4. The Java 25 backend will boot on port **`8080`**:
   - **Base URL**: `http://localhost:8080`
   - **Health Check**: `http://localhost:8080/healthz`
   - **Prometheus Metrics**: `http://localhost:8080/actuator/prometheus`
   - **RAG Knowledge Base**: `http://localhost:8080/api/rag/conversations`
   - **Conversation Scenarios**: `http://localhost:8080/api/learning/scenarios`

---

### ⚛️ 2. Starting the Frontend

1. Open a **second terminal window** and navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```

4. The frontend will start at:
   👉 **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:5173`)

5. The frontend Vite configuration is pre-configured with an automatic reverse proxy:
   - All requests sent to `/api/*` are automatically forwarded to the Java 25 backend at `http://localhost:8080`.
   - You can speak, record dialogues in RAG, and test conversations with Bram de Vries!

---

## 🧠 RAG Knowledge Base & Bram de Vries Integration

### How RAG Works
1. **Live Recording & Ingestion**:
   In the **Kennisbank & RAG** tab, you can record authentic Dutch workplace conversations, standups, or paste meeting transcripts. The backend extracts Dutch idioms (e.g., *"even kortsluiten"*, *"sparren over"*, *"de schouders eronder zetten"*) and computes a 64-dimensional lexical similarity vector.
2. **Context Injection into Dialogues**:
   When conversing with **Bram de Vries** (Engineering Lead in Amsterdam) or any other tutor:
   - If you ask about specific team events, people, or companies present in RAG (e.g., *"Wat weet je over de standup bij Booking en wat heeft Lars gezegd over de datamigratie?"*), the backend retrieves the exact match with high similarity.
   - Bram directly acknowledges the standup, mentions Lars's PostgreSQL migration, and confirms the staging latency is under 50ms, before coaching your Dutch grammar!

---

## 🚀 Pushing to GitHub (Same Repo, Separate Folders)

To push the entire codebase (with `backend/` and `frontend/` folders) to your GitHub repository:

```bash
# 1. Ensure you are in the root directory
pwd

# 2. Stage all changes (backend, frontend, configs, README)
git add .

# 3. Commit with a descriptive message
git commit -m "feat: migrate backend to Java 25 Spring Boot and structure repository into Backend and Frontend folders"

# 4. Set main branch and push to your GitHub remote
git branch -M main
git push -u origin main
```

If you haven't added the remote origin yet:
```bash
git remote add origin https://github.com/vvyavahare/PraatNederlands.git
git push -u origin main
```

---

## 🛠️ Java 25 Enterprise Highlights

The `backend/` leverages key modern Java 25 capabilities:
- **Project Loom Virtual Threads**: Enabled via `spring.threads.virtual.enabled: true` for zero-overhead, high-throughput asynchronous HTTP processing.
- **Java 25 Immutable Records**: Used across all domain objects (`ConversationTurn`, `RealtimeConversationRecord`, `RoleplayScenario`, `DutchTutorResponse`) for memory safety and zero boilerplate.
- **Pattern Matching**: Employed in grammar evaluation rules for verb-second inversion (`Inversie`), subordinate clause order (`SOV`), and article gender (`de/het`).
- **RESTful API Surface**: Full compatibility with the existing frontend client endpoints (`/api/conversation/*`, `/api/rag/*`, `/api/learning/*`, `/api/ops/*`).

---

## 🎙️ Speech Recognition & Browser Notes

- **Supported Browsers**: Google Chrome, Microsoft Edge, and Brave provide the best support for the Web Speech Recognition API and native Dutch speech synthesis.
- **Microphone Permissions**: Click **"Allow"** when prompted by the browser for microphone access on `http://localhost:3000`.

---

## 📄 License
This project is licensed under the MIT License.
Veel succes met het leren van Nederlands! 🇳🇱🚀
