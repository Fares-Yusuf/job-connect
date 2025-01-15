const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  jobTitle: {
    type: String,
    required: true,
  },
  jobDesc: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  applicants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending'
    }
  }],
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  linkedin: {
    type: String
  },
  github: {
    type: String
  },
  jobs: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined'],
      default: 'pending'
    }
  }],
});

const Job = mongoose.model('Job', jobSchema);
const User = mongoose.model('User', userSchema);

module.exports = { User, Job };
