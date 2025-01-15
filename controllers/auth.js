const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User } = require('../models/user.js');

// Render the sign-up page
router.get('/sign-up', (req, res) => {
  res.render('auth/sign-up.ejs');
});

// Render the sign-in page
router.get('/sign-in', (req, res) => {
  res.render('auth/sign-in.ejs');
});

// Handle user sign-out
router.get('/sign-out', (req, res) => {
  req.session.destroy();
  res.redirect('/auth/sign-in');
});

// Handle user sign-up
router.post('/sign-up', async (req, res) => {
  try {
    const userInDatabase = await User.findOne({ username: req.body.username });
    if (userInDatabase) {
      return res.status(400).send('Username already taken.');
    }

    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).send('Password and Confirm Password must match.');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Create new user with an empty jobs array
    const newUser = await User.create({
      username: req.body.username,
      password: hashedPassword,
      fullName: req.body.fullName,
      userType: 'user', // Default to 'user'
      linkedin: req.body.linkedin || '',
      github: req.body.github || '',
      jobs: []
    });

    res.redirect('/auth/sign-in');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});

// Handle user sign-in
router.post('/sign-in', async (req, res) => {
  try {
    const userInDatabase = await User.findOne({ username: req.body.username });
    if (!userInDatabase) {
      return res.status(401).send('Login failed. Invalid username or password.');
    }

    const validPassword = await bcrypt.compare(req.body.password, userInDatabase.password);
    if (!validPassword) {
      return res.status(401).send('Login failed. Invalid username or password.');
    }

    // Set session with user data
    req.session.user = {
      username: userInDatabase.username,
      _id: userInDatabase._id,
      userType: userInDatabase.userType
    };

    // Redirect to the home page after successful login
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error. Please try again later.');
  }
});

module.exports = router;
