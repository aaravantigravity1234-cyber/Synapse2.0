# Synapse AI - Aura AI Assistant

Synapse AI is an intelligent assistant platform powered by the Aura AI.

## Project Structure

The project is divided into two main parts:
- `backend/`: An Express server that handles API requests, rate limiting, and interacts with Firebase Admin SDK and OpenAI.
- `frontend/`: The user interface for the Aura AI assistant, featuring a liquid-glass design, dark mode, and real-time chat capabilities.

## Features

- **Chat Interface:** A modern, responsive chat interface with a dark theme and liquid mesh background.
- **Authentication:** Secure user authentication using Firebase.
- **AI Integration:** Powered by advanced language models via the OpenAI API.
- **Rate Limiting:** Built-in rate limiting to prevent abuse and ensure fair usage.
- **File Attachments:** Support for uploading and sharing files within the chat.
- **Chat History:** Persistent chat history stored via Firebase.

## Technologies Used

- **Backend:** Node.js, Express, Firebase Admin SDK, OpenAI SDK
- **Frontend:** HTML5, CSS3, JavaScript (ES6+)

## Setup & Installation

### Backend
1. Navigate to the `backend/` directory.
2. Install dependencies:
   ```bash
   npm install --prefix backend
   ```
3. Copy `.env.example` to `.env` and configure your environment variables (Firebase Project ID, OpenAI API Key, etc.).
4. Start the server:
   ```bash
   npm start --prefix backend
   ```

### Frontend
1. The frontend is served statically by the backend server.
2. Ensure the backend server is running and access the application via `http://localhost:3000` (or the configured PORT).

## Environment Variables

The backend requires an `.env` file with the following variables (see `.env.example`):
- `PORT`: The port for the Express server (default: 3000)
- `FIREBASE_PROJECT_ID`: Your Firebase project ID
- `OPENAI_API_KEY`: Your OpenAI API key

## License
MIT License
