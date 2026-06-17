require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const { requireAuth, verifyCredentials } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === 'true',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// Auth routes
app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ok = await verifyCredentials(username, password);
  if (ok) {
    req.session.authenticated = true;
    res.redirect('/');
  } else {
    res.render('login', { error: 'Invalid username or password.' });
  }
});

app.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// Main page
app.get('/', requireAuth, (req, res) => {
  res.render('index');
});

// API routes (all behind session auth)
app.use('/api/habits', requireAuth, require('./routes/habits'));
app.use('/api/notes', requireAuth, require('./routes/notes'));

// 404 handler
app.use((req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => {
  console.log(`DailyHabits running on http://localhost:${PORT}`);
});
