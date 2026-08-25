# Code Learning Platform

A modern, interactive web application for learning to code with Monaco editor, interactive quizzes, and premium content.

## Features

✨ **Core Features:**
- 🔐 User authentication with JWT tokens
- 📚 Interactive code lessons
- 💻 Monaco code editor for live coding
- 🧪 Interactive HTML/JS quizzes
- 👑 Premium content for subscribers
- 📊 Progress tracking
- 🎯 Difficulty levels (Beginner, Intermediate, Advanced)

## Tech Stack

**Backend:**
- Node.js with Express.js
- SQLite3 for database
- Passport.js for authentication
- JWT for token management
- bcryptjs for password hashing

**Frontend:**
- Vanilla JavaScript (no framework)
- Monaco Editor (VS Code's editor)
- CSS3 with modern design
- Responsive layout

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ishwar416/code-learning-platform.git
cd code-learning-platform
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your settings (JWT_SECRET, PORT, etc.)

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

The application will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Lessons
- `GET /api/lessons` - Get all available lessons
- `GET /api/lessons/:id` - Get specific lesson
- `GET /api/lessons/:lessonId/quizzes` - Get quizzes for a lesson

### Quizzes
- `POST /api/quizzes/:quizId/submit` - Submit quiz answers

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/progress` - Get user progress
- `POST /api/user/upgrade` - Upgrade to premium

## Database Schema

### Users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT,
  username TEXT UNIQUE,
  isPremium BOOLEAN,
  createdAt DATETIME
)
```

### Lessons
```sql
CREATE TABLE lessons (
  id INTEGER PRIMARY KEY,
  title TEXT,
  description TEXT,
  content TEXT,
  isPremium BOOLEAN,
  language TEXT,
  difficulty TEXT,
  createdAt DATETIME
)
```

### Quizzes
```sql
CREATE TABLE quizzes (
  id INTEGER PRIMARY KEY,
  lessonId INTEGER,
  title TEXT,
  questions TEXT,
  isPremium BOOLEAN,
  createdAt DATETIME
)
```

### User Progress
```sql
CREATE TABLE userProgress (
  id INTEGER PRIMARY KEY,
  userId INTEGER,
  lessonId INTEGER,
  quizId INTEGER,
  score INTEGER,
  completed BOOLEAN,
  completedAt DATETIME
)
```

## Project Structure

```
code-learning-platform/
├── server.js                 # Main backend server
├── package.json              # Dependencies
├── .env.example              # Environment template
├── public/
│   ├── index.html           # Main HTML file
│   ├── app.js               # Frontend app logic
│   └── styles.css           # Styling
├── data/
│   └── learning.db          # SQLite database
└── README.md
```

## Usage Examples

### Register a User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "john_doe",
    "password": "securePassword123"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

### Get Lessons (requires JWT token)
```bash
curl http://localhost:5000/api/lessons \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Features Breakdown

### 1. User Authentication
- Secure registration with password hashing
- JWT-based authentication
- Session management
- Protected routes

### 2. Monaco Code Editor
- Real-time code editing
- JavaScript execution
- Syntax highlighting
- Console output

### 3. Interactive Quizzes
- Multiple choice questions
- Score tracking
- Progress persistence
- Quiz attempts history

### 4. Premium Content
- Gated lessons for premium users
- Subscription management
- Feature unlock system

### 5. Progress Tracking
- Lesson completion tracking
- Quiz score history
- User statistics

## Future Enhancements

- [ ] Support for multiple programming languages
- [ ] Real-time collaboration
- [ ] Video tutorials
- [ ] Certificate generation
- [ ] Payment integration (Stripe)
- [ ] Social learning features
- [ ] Mobile app version
- [ ] AI-powered code feedback
- [ ] Leaderboard system
- [ ] Difficulty-based recommendations

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal and commercial purposes.

## Support

For issues or questions, please open a GitHub issue or contact the maintainers.

---

**Made with ❤️ for learning**
