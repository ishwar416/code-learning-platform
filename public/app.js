// State Management
const state = {
  user: null,
  currentPage: 'home',
  lessons: [],
  currentLesson: null,
  token: localStorage.getItem('token')
};

const API_BASE = 'http://localhost:5000/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  if (state.token) {
    verifyToken();
  } else {
    navigateTo('login');
  }
});

// Auth Functions
async function register(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    showAlert('Passwords do not match', 'danger');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      state.token = data.token;
      showAlert('Registration successful!', 'success');
      setTimeout(() => navigateTo('lessons'), 1000);
    } else {
      showAlert(data.message, 'danger');
    }
  } catch (err) {
    showAlert('Registration failed', 'danger');
  }
}

async function login(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      state.token = data.token;
      state.user = data.user;
      showAlert('Login successful!', 'success');
      setTimeout(() => navigateTo('lessons'), 1000);
    } else {
      showAlert(data.message, 'danger');
    }
  } catch (err) {
    showAlert('Login failed', 'danger');
  }
}

async function verifyToken() {
  try {
    const res = await fetch(`${API_BASE}/user/profile`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.user = data;
      navigateTo('lessons');
    } else {
      localStorage.removeItem('token');
      navigateTo('login');
    }
  } catch (err) {
    navigateTo('login');
  }
}

function logout() {
  localStorage.removeItem('token');
  state.token = null;
  state.user = null;
  navigateTo('login');
}

// Lesson Functions
async function fetchLessons() {
  try {
    const res = await fetch(`${API_BASE}/lessons`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.lessons = await res.json();
      renderLessons();
    } else if (res.status === 401) {
      navigateTo('login');
    }
  } catch (err) {
    showAlert('Failed to fetch lessons', 'danger');
  }
}

function renderLessons() {
  const lessonsContainer = document.getElementById('lessonsContainer');
  if (!lessonsContainer) return;
  
  lessonsContainer.innerHTML = state.lessons.map(lesson => `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h3 class="card-title">${lesson.title}
            ${lesson.isPremium ? '<span class="premium-badge">👑 PREMIUM</span>' : ''}
          </h3>
          <p class="card-description">${lesson.description}</p>
          <p><small style="color: #6b7280;">Difficulty: <strong>${lesson.difficulty || 'Beginner'}</strong></small></p>
        </div>
      </div>
      <button class="btn btn-primary" onclick="viewLesson(${lesson.id})">View Lesson</button>
    </div>
  `).join('');
}

async function viewLesson(lessonId) {
  try {
    const res = await fetch(`${API_BASE}/lessons/${lessonId}`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.status === 403) {
      showAlert('This is premium content. Subscribe to access!', 'warning');
      navigateTo('premium');
      return;
    }
    if (res.ok) {
      const lesson = await res.json();
      state.currentLesson = lesson;
      navigateTo('lesson-detail');
    }
  } catch (err) {
    showAlert('Failed to fetch lesson', 'danger');
  }
}

function renderLessonDetail() {
  if (!state.currentLesson) return;
  const container = document.getElementById('lessonDetailContainer');
  if (!container) return;
  
  container.innerHTML = `
    <button class="btn btn-secondary btn-small" onclick="navigateTo('lessons')">← Back to Lessons</button>
    <div class="card" style="margin-top: 1.5rem;">
      <h1>${state.currentLesson.title}
        ${state.currentLesson.isPremium ? '<span class="premium-badge">👑 PREMIUM</span>' : ''}
      </h1>
      <p>${state.currentLesson.description}</p>
      <div style="background-color: #f3f4f6; padding: 1.5rem; border-radius: 0.5rem; margin: 1.5rem 0; border-left: 4px solid var(--primary);">
        <pre><code>${state.currentLesson.content}</code></pre>
      </div>
      <button class="btn btn-primary" onclick="startQuiz(${state.currentLesson.id})">Take Quiz</button>
    </div>
  `;
}

// Quiz Functions
async function startQuiz(lessonId) {
  try {
    const res = await fetch(`${API_BASE}/lessons/${lessonId}/quizzes`, {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      const quizzes = await res.json();
      if (quizzes.length > 0) {
        state.currentQuiz = JSON.parse(quizzes[0].questions);
        state.currentQuizId = quizzes[0].id;
        state.quizAnswers = {};
        navigateTo('quiz');
      } else {
        showAlert('No quizzes available for this lesson', 'warning');
      }
    }
  } catch (err) {
    showAlert('Failed to load quiz', 'danger');
  }
}

function renderQuiz() {
  const container = document.getElementById('quizContainer');
  if (!container || !state.currentQuiz) return;
  
  const questions = Array.isArray(state.currentQuiz) ? state.currentQuiz : state.currentQuiz.questions || [];
  
  container.innerHTML = `
    <div class="quiz-container">
      <h2 style="margin-bottom: 1rem;">Quiz: ${state.currentQuiz.title || 'Code Challenge'}</h2>
      ${questions.map((q, idx) => `
        <div class="question-card">
          <div class="question-title">Q${idx + 1}: ${q.question}</div>
          <div class="options">
            ${q.options.map((opt, optIdx) => `
              <label class="option-label">
                <input type="radio" name="q${idx}" value="${optIdx}" onchange="state.quizAnswers[${idx}] = ${optIdx}">
                ${opt}
              </label>
            `).join('')}
          </div>
        </div>
      `).join('')}
      <button class="btn btn-success" style="width: 100%; margin-top: 1.5rem;" onclick="submitQuiz()">Submit Quiz</button>
    </div>
  `;
}

async function submitQuiz() {
  const questions = Array.isArray(state.currentQuiz) ? state.currentQuiz : state.currentQuiz.questions || [];
  let score = 0;
  
  questions.forEach((q, idx) => {
    if (state.quizAnswers[idx] === q.correctAnswer) score++;
  });
  
  try {
    const res = await fetch(`${API_BASE}/quizzes/${state.currentQuizId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ score })
    });
    if (res.ok) {
      showAlert(`Quiz submitted! Score: ${score}/${questions.length}`, 'success');
      setTimeout(() => navigateTo('lessons'), 1500);
    }
  } catch (err) {
    showAlert('Failed to submit quiz', 'danger');
  }
}

// Navigation
function navigateTo(page) {
  state.currentPage = page;
  const app = document.getElementById('app');
  
  const pages = {
    login: () => `
      <div class="auth-container">
        <div class="auth-box">
          <h1 class="auth-title">Login</h1>
          <form onsubmit="login(event)">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Login</button>
          </form>
          <div class="auth-link">
            Don't have an account? <a href="#" onclick="navigateTo('register')">Sign up</a>
          </div>
        </div>
      </div>
    `,
    register: () => `
      <div class="auth-container">
        <div class="auth-box">
          <h1 class="auth-title">Sign Up</h1>
          <form onsubmit="register(event)">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="email" required>
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="username" required>
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="password" required>
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <input type="password" id="confirmPassword" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Sign Up</button>
          </form>
          <div class="auth-link">
            Already have an account? <a href="#" onclick="navigateTo('login')">Login</a>
          </div>
        </div>
      </div>
    `,
    lessons: () => `
      ${renderNavbar()}
      <div class="container">
        <h1 style="margin: 2rem 0;">📚 Lessons</h1>
        <div id="lessonsContainer"></div>
      </div>
      ${fetchLessons() || ''}
    `,
    'lesson-detail': () => `
      ${renderNavbar()}
      <div class="container">
        <div id="lessonDetailContainer"></div>
      </div>
      ${renderLessonDetail() || ''}
    `,
    quiz: () => `
      ${renderNavbar()}
      <div class="container">
        <div id="quizContainer"></div>
      </div>
      ${renderQuiz() || ''}
    `,
    editor: () => `
      ${renderNavbar()}
      <div class="container">
        <h1 style="margin: 2rem 0;">💻 Code Editor</h1>
        <p>Write and test your code in real-time:</p>
        <div id="editor" style="width: 100%; height: 400px; border: 1px solid #e5e7eb; border-radius: 0.5rem;"></div>
        <div style="display: flex; gap: 1rem; margin: 1rem 0;">
          <button class="btn btn-primary" onclick="runCode()">Run Code</button>
          <button class="btn btn-secondary" onclick="clearEditor()">Clear</button>
        </div>
        <h3 style="margin-top: 2rem;">Output:</h3>
        <div id="output" class="editor-output">Ready for execution...</div>
      </div>
      ${initializeEditor() || ''}
    `,
    premium: () => `
      ${renderNavbar()}
      <div class="container">
        <div style="max-width: 600px; margin: 3rem auto; text-align: center;">
          <h1>👑 Premium Content</h1>
          <p style="font-size: 1.125rem; color: #6b7280; margin: 1rem 0;">Unlock all advanced lessons and exclusive content</p>
          <div class="card" style="margin: 2rem 0;">
            <h3>Features:</h3>
            <ul style="text-align: left; display: inline-block;">
              <li>✅ Advanced Algorithms</li>
              <li>✅ System Design Patterns</li>
              <li>✅ Project-based Learning</li>
              <li>✅ Code Interview Prep</li>
              <li>✅ Priority Support</li>
            </ul>
          </div>
          <button class="btn btn-success" style="padding: 1rem 2rem; font-size: 1.125rem;" onclick="upgradeToPremium()">Upgrade for \$9.99/month</button>
          <p style="margin-top: 1rem; color: #6b7280;">or continue with <a href="#" onclick="navigateTo('lessons')" style="color: var(--primary);">free lessons</a></p>
        </div>
      </div>
    `
  };
  
  app.innerHTML = pages[page]();
}

function renderNavbar() {
  const isPremium = state.user?.isPremium ? '👑 Premium' : 'Upgrade';
  return `
    <nav class="navbar">
      <div class="navbar-content">
        <div class="logo">💻 CodeLearn</div>
        <ul class="nav-links">
          <li><a href="#" onclick="navigateTo('lessons')">Lessons</a></li>
          <li><a href="#" onclick="navigateTo('editor')">Editor</a></li>
          <li><a href="#" onclick="navigateTo('premium')">Premium</a></li>
        </ul>
        <div class="user-menu">
          ${state.user?.isPremium ? '<span class="badge">👑 Premium</span>' : ''}
          <span style="color: #6b7280;">${state.user?.username || ''}</span>
          <button class="btn btn-secondary btn-small" onclick="logout()">Logout</button>
        </div>
      </div>
    </nav>
  `;
}

// Code Editor
function initializeEditor() {
  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
  require(['vs/editor/editor.main'], () => {
    window.editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Write your JavaScript code here\nconst greeting = "Hello, World!"\nconsole.log(greeting);',
      language: 'javascript',
      theme: 'vs-dark'
    });
  });
}

function runCode() {
  if (!window.editor) return;
  const code = window.editor.getValue();
  const output = document.getElementById('output');
  output.innerHTML = '';
  
  try {
    const log = console.log;
    const logs = [];
    console.log = (...args) => logs.push(args.join(' '));
    eval(code);
    console.log = log;
    output.innerHTML = logs.length ? logs.join('\n') : 'Code executed successfully!';
  } catch (err) {
    output.innerHTML = `<span style="color: #ef4444;">Error: ${err.message}</span>`;
  }
}

function clearEditor() {
  if (window.editor) {
    window.editor.setValue('');
  }
}

// Premium Upgrade
async function upgradeToPremium() {
  try {
    const res = await fetch(`${API_BASE}/user/upgrade`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (res.ok) {
      state.user.isPremium = true;
      showAlert('You are now a premium member!', 'success');
      setTimeout(() => fetchLessons(), 1000);
    }
  } catch (err) {
    showAlert('Upgrade failed', 'danger');
  }
}

// Utilities
function showAlert(message, type = 'info') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.top = '20px';
  alert.style.right = '20px';
  alert.style.zIndex = '9999';
  alert.style.maxWidth = '400px';
  document.body.appendChild(alert);
  setTimeout(() => alert.remove(), 3000);
}
