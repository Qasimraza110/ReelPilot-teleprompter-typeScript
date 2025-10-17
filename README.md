🎬 ReelPilot — AI Script Reading & Video Analysis Platform

ReelPilot is an intelligent web platform that helps users record themselves reading scripts and receive instant AI-driven performance feedback.
It uses Deepgram for speech-to-text and analysis — giving insights on clarity, pacing, confidence, and delivery.
 
Built with the MERN stack and Next.js, ReelPilot is designed for smooth video capture, smart analytics, and an elegant user experience.

🌟 Core Features
🎭 Script-Based Practice

Users can view or select a script, then record themselves performing it on camera.

🎥 Real-Time Recording & Preview

Record video directly from the browser and see an instant preview without uploading to the backend.

🧠 AI-Powered Speech Analysis (Deepgram)

Once uploaded, ReelPilot uses Deepgram’s advanced speech recognition to:

Transcribe spoken words accurately.

Detect pauses, filler words, and pacing.

Measure confidence and energy in tone.

Identify off-script moments.

📊 Performance Metrics

Users receive a detailed analysis report containing:

Transcript accuracy

Speaking pace (WPM)

Clarity score

Confidence score

AI feedback summary

💾 Video & Data Storage

Recordings and analysis results are stored securely in MongoDB and cloud storage (e.g., AWS S3 or Cloudinary).

🏗️ Tech Stack
Layer	Technology
Frontend	Next.js (React 18), Tailwind CSS
Backend	Node.js, Express.js
Database	MongoDB
Auth	JWT (stored in session cookie)
Speech Analysis	Deepgram API
Storage	AWS S3 / Cloudinary
