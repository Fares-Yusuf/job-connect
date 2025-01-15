require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');

// Import middleware
const isSignedIn = require('./middleware/is-signed-in.js');
const passUserToView = require('./middleware/pass-user-to-view.js');
const isAdmin = require('./middleware/is-admin.js');

// Import controllers
const jobsController = require('./controllers/jobs.js');
const authController = require('./controllers/auth.js');

const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log(`Connected to MongoDB ${mongoose.connection.name}.`);
});

// Middleware setup
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
  })
);

app.use(passUserToView);

// Routes
app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/jobs'); // Redirect signed-in users to jobs index
  } else {
    res.render('index.ejs'); // Render homepage for guests
  }
});

app.use('/auth', authController);

// Protect all job routes with isSignedIn middleware
app.use('/jobs', isSignedIn, jobsController);

// Example route for admin-only access
app.get('/admin/dashboard', isSignedIn, isAdmin, (req, res) => {
  res.send('Welcome to the Admin Dashboard.');
});

// Start the server
app.listen(port, () => {
  console.log(`The express app is ready on port ${port}!`);
});
