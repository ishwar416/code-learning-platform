require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Database Setup
const dbPath = process.env.DATABASE_URL || './data/learning.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error(err);
  else console.log('Connected to SQLite database');
});

// Initialize Database
const initDB = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      isPremium BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      isPremium BOOLEAN DEFAULT 0,
      language TEXT,
      difficulty TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lessonId INTEGER,
      title TEXT NOT NULL,
      questions TEXT NOT NULL,
      isPremium BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lessonId) REFERENCES lessons(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS userProgress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      lessonId INTEGER,
      quizId INTEGER,
      score INTEGER,
      completed BOOLEAN DEFAULT 0,
      completedAt DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (lessonId) REFERENCES lessons(id),
      FOREIGN KEY (quizId) REFERENCES quizzes(id)
    )
  `);
};

initDB();

// Passport Strategies
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'User not found' });
    
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Invalid password' });
    });
  });
}));

passport.use(new JWTStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET
}, (payload, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [payload.id], (err, user) => {
    if (err) return done(err);
    if (user) return done(null, user);
    return done(null, false);
  });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    done(err, user);
  });
});

// Routes

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, username } = req.body;
  
  if (!email || !password || !username) {
    return res.status(400).json({ message: 'All fields required' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ error: err });
    
    db.run('INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
      [email, hashedPassword, username],
      function(err) {
        if (err) return res.status(400).json({ message: 'Email or username already exists' });
        
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ message: 'User registered', token });
      }
    );
  });
});

// Login
app.post('/api/auth/login', passport.authenticate('local', { session: false }), (req, res) => {
  const token = jwt.sign({ id: req.user.id, email: req.user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ message: 'Login successful', token, user: req.user });
});

// Get Lessons
app.get('/api/lessons', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.all('SELECT * FROM lessons', (err, lessons) => {
    if (err) return res.status(500).json({ error: err });
    
    const filteredLessons = lessons.filter(lesson => {
      if (lesson.isPremium && !req.user.isPremium) return false;
      return true;
    });
    
    res.json(filteredLessons);
  });
});

// Get Single Lesson
app.get('/api/lessons/:id', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.get('SELECT * FROM lessons WHERE id = ?', [req.params.id], (err, lesson) => {
    if (err) return res.status(500).json({ error: err });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    
    if (lesson.isPremium && !req.user.isPremium) {
      return res.status(403).json({ message: 'Premium content. Subscribe to access.' });
    }
    
    res.json(lesson);
  });
});

// Get Quizzes for Lesson
app.get('/api/lessons/:lessonId/quizzes', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.all('SELECT * FROM quizzes WHERE lessonId = ?', [req.params.lessonId], (err, quizzes) => {
    if (err) return res.status(500).json({ error: err });
    
    const filtered = quizzes.filter(q => {
      if (q.isPremium && !req.user.isPremium) return false;
      return true;
    });
    
    res.json(filtered);
  });
});

// Submit Quiz
app.post('/api/quizzes/:quizId/submit', passport.authenticate('jwt', { session: false }), (req, res) => {
  const { score } = req.body;
  
  db.get('SELECT lessonId FROM quizzes WHERE id = ?', [req.params.quizId], (err, quiz) => {
    if (err) return res.status(500).json({ error: err });
    
    db.run(
      'INSERT INTO userProgress (userId, lessonId, quizId, score, completed, completedAt) VALUES (?, ?, ?, ?, 1, datetime("now"))',
      [req.user.id, quiz.lessonId, req.params.quizId, score],
      function(err) {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: 'Quiz submitted', score, progressId: this.lastID });
      }
    );
  });
});

// Get User Progress
app.get('/api/user/progress', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.all('SELECT * FROM userProgress WHERE userId = ?', [req.user.id], (err, progress) => {
    if (err) return res.status(500).json({ error: err });
    res.json(progress);
  });
});

// Upgrade to Premium
app.post('/api/user/upgrade', passport.authenticate('jwt', { session: false }), (req, res) => {
  db.run('UPDATE users SET isPremium = 1 WHERE id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Upgraded to premium' });
  });
});

// Get User Profile
app.get('/api/user/profile', passport.authenticate('jwt', { session: false }), (req, res) => {
  res.json(req.user);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
