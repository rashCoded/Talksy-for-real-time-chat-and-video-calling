# Talksy

<p align="center">
  A real-time full-stack communication platform supporting instant messaging, media sharing, and peer-to-peer video calling — built on three protocols working in concert.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=flat-square&logo=spring"/>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js"/>
  <img src="https://img.shields.io/badge/WebSocket-STOMP-010101?style=flat-square"/>
  <img src="https://img.shields.io/badge/WebRTC-P2P-333333?style=flat-square"/>
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql"/>
  <img src="https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
</p>

---

## What It Does

Talksy is a full-stack real-time communication platform where users can chat instantly, share files and media, track message delivery status, and make peer-to-peer video calls — all in one application. It runs three protocols simultaneously, each chosen for what it does best.

---

## Features

### 💬 Real-Time Messaging
- Instant text messaging over STOMP/WebSocket with stable multi-user connection handling
- 5 message types — TEXT, IMAGE, VIDEO, AUDIO, FILE — with dynamic content-type resolution
- Message delivery status tracking — SENT, DELIVERED, READ — per message
- Emoji reactions on messages

### 📹 Video Calling
- Peer-to-peer video calls via WebRTC — video bandwidth never touches the backend server
- WebSocket used as the signaling layer for ICE candidate exchange and session negotiation
- Call logs stored in the database with caller, receiver, status, and duration

### 👥 Friend System
- Send, accept, and reject friend requests
- Online/offline presence tracking with last seen timestamps
- User search and profile management

### 🔐 Authentication & Security
- Stateless JWT authentication via custom `AuthTokenFilter` extending `OncePerRequestFilter`
- JWT validated on every REST request and on every WebSocket connection upgrade
- OTP-based email verification for new accounts and password resets using JavaMailSender with 10-minute expiry
- BCrypt password hashing

### 📁 File & Media Handling
- Upload avatars and send attachments directly in chat
- Backend dynamically resolves uploaded file `ContentType` to typed enums (IMAGE, VIDEO, AUDIO, FILE) — no reliance on file extensions
- UUID-based filenames prevent collisions and avoid exposing original file names

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.2 |
| Security | Spring Security, JWT (JJWT), BCrypt |
| Real-time | Spring WebSocket, STOMP protocol |
| Video | WebRTC (peer-to-peer) |
| Data | Spring Data JPA, Hibernate, MySQL 8 |
| Email | Spring Boot Starter Mail, JavaMailSender |
| Build | Maven |
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Shadcn UI (Radix UI) |
| WebSocket Client | @stomp/stompjs, sockjs-client |
| Forms | react-hook-form, Zod |
| Icons | lucide-react |

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│               Next.js 15 Frontend                │
│   (TypeScript, Tailwind, Shadcn, STOMP Client)   │
└──────┬───────────────┬──────────────┬────────────┘
       │               │              │
   REST API        STOMP/WS        WebRTC
   (JWT Auth)    (Real-time)      (P2P Video)
       │               │              │
┌──────▼───────────────▼──────────────▼────────────┐
│             Spring Boot Backend                   │
│                                                   │
│  REST Controllers  →  Auth, Files, Users          │
│  WebSocket/STOMP   →  Chat, Presence, Signaling   │
│  AuthTokenFilter   →  JWT on every request        │
└──────────────────────────┬────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────┐
│                   MySQL 8                         │
│  users · messages · calls · reactions · friends   │
└───────────────────────────────────────────────────┘
```

### 3-Protocol Design
| Protocol | Used For | Why |
|----------|----------|-----|
| REST API | Auth, file uploads, user management, message history | Stateless, cacheable, standard |
| STOMP over WebSocket | Real-time messaging, delivery status, presence | Persistent connection, pub/sub routing |
| WebRTC | Peer-to-peer video calls | Offloads video bandwidth entirely from backend |

### WebSocket Endpoints
```
ws://localhost:8080/ws          → Initial handshake
/app/chat.sendMessage           → Send a message
/app/chat.addUser               → User joins
/app/webrtc.signal              → WebRTC signaling relay
/topic/public                   → Broadcast channel
/queue/messages                 → Private message queue
```

---

## Database Schema

```
users             → username, email, passwordHash, avatarUrl,
                    online (bool), last_seen, otp fields, bio
messages          → sender, receiver, content, type (enum),
                    status (enum), fileUrl, reactions
calls             → caller_id, receiver_id, status,
                    started_at, duration_seconds
message_reactions → message_id (FK), user_id (FK), emoji
friend_requests   → requester_id, receiver_id, status (enum)
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new account |
| POST | `/api/auth/signin` | Login and receive JWT |
| POST | `/api/auth/verify` | OTP email verification |
| POST | `/api/auth/forgot-password` | Initiate password reset |
| POST | `/api/auth/reset-password` | Complete password reset |

### File Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload chat attachment |
| POST | `/api/files/avatar` | Upload profile avatar |
| GET | `/api/files/download/{filename}` | Retrieve file |
| GET | `/api/files/download/avatars/{filename}` | Retrieve avatar |

---

## Engineering Decisions Worth Knowing

**3-Protocol Hybrid Architecture**
REST, WebSocket, and WebRTC each handle what they're actually good at. REST for stateless ops, STOMP for persistent real-time channels, WebRTC for video so the server never touches video streams. This is a deliberate design choice — not over-engineering, but using the right tool per concern.

**JWT Authentication on WebSocket Upgrades**
HTTP headers aren't available after a WebSocket connection upgrades. The custom `AuthTokenFilter` intercepts the STOMP CONNECT frame before the handshake completes, validates the JWT, and either authenticates the session or drops the connection. Same security model across REST and WebSocket, no gaps.

**Dynamic ContentType Resolution**
When a file is uploaded, the backend inspects the exact MIME type (e.g. `image/png`, `video/mp4`) and maps it to a typed enum — IMAGE, VIDEO, AUDIO, FILE. The frontend receives the enum and renders the appropriate player or viewer. No guessing from file extensions, no broken previews.

**Native OTP Without Third-Party Auth**
Instead of delegating to Auth0 or Firebase, OTP generation, expiry tracking (`otpExpiry` as `LocalDateTime`), and email dispatch are all handled natively via JavaMailSender. Simpler dependency tree, full control over the flow.

---

## Running Locally

### Prerequisites
- Java 17 or higher
- Node.js & npm
- MySQL 8 running locally

### Backend
```bash
cd backend
# Configure your DB credentials in:
# src/main/resources/application.properties

mvn spring-boot:run
# Backend runs on http://localhost:8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
```

---

## What I Learned

Building Talksy taught me that real-time systems aren't just about WebSockets — they're about choosing the right protocol per concern and making them work together securely. Authenticating WebSocket connections was the most interesting challenge: HTTP semantics don't apply post-upgrade, so you have to intercept at the STOMP layer. The WebRTC signaling logic also clarified something important — P2P doesn't mean no server, it means the server's job is coordination, not data transport.

---

## Author

**Rashmi Ranjan Badajena**
[GitHub](https://github.com/rashCoded) · [LinkedIn](https://www.linkedin.com/in/rashmiranjan-badajena/) · rashmiranjanbadajena.it@gmail.com

---

<p align="center">Built for the love of systems that actually work in real time.</p>
