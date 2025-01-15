const express = require('express');
const router = express.Router();
const { User, Job } = require('../models/user.js');
const isSignedIn = require('../middleware/is-signed-in');
const isAdmin = require('../middleware/is-admin');

// Fetch all active jobs for users
router.get('/', isSignedIn, async (req, res) => {
    try {
        const activeJobs = await Job.find({ status: 'active' });
        res.render('jobs/index.ejs', { jobs: activeJobs });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Fetch all inactive jobs for admins
router.get('/inactive', isSignedIn, isAdmin, async (req, res) => {
    try {
        const inactiveJobs = await Job.find({ status: 'inactive' });
        res.render('jobs/inactive.ejs', { jobs: inactiveJobs });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Render the form to create a new job (Admins only)
router.get('/new', isSignedIn, isAdmin, (req, res) => {
    res.render('jobs/new.ejs');
});

// Create a new job (Admins only)
router.post('/', isSignedIn, isAdmin, async (req, res) => {
    try {
        await Job.create(req.body);
        res.redirect('/jobs');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// View details of a specific job
router.get('/:jobId', isSignedIn, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId).populate('applicants.user');

        const userJob = await User.findById(req.session.user._id).populate('jobs.job');
        const userStatus = userJob.jobs.find(app => app.job._id.toString() === req.params.jobId)?.status;

        res.render('jobs/show.ejs', { job, userStatus });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Delete a job (Admins only)
router.delete('/:jobId', isSignedIn, isAdmin, async (req, res) => {
    try {
        await Job.findByIdAndDelete(req.params.jobId);
        res.redirect('/jobs');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Render the form to edit a job (Admins only)
router.get('/:jobId/edit', isSignedIn, isAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        res.render('jobs/edit.ejs', { job });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Update a job (Admins only)
router.put('/:jobId', isSignedIn, isAdmin, async (req, res) => {
    try {
        await Job.findByIdAndUpdate(req.params.jobId, req.body, { new: true });
        res.redirect('/jobs');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Apply for a job (Users only)
router.post('/:jobId/apply', isSignedIn, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        const currentUser = await User.findById(req.session.user._id);

        if (!job || job.status !== 'active') {
            return res.status(400).send('Job is not available.');
        }

        job.applicants.push({ user: currentUser._id, status: 'pending' });
        await job.save();

        currentUser.jobs.push({ job: job._id, status: 'pending' });
        await currentUser.save();

        res.redirect(`/jobs/${job._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Update application status (Admins only)
router.patch('/:jobId/applicants/:applicantId', isSignedIn, isAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        const applicant = job.applicants.find(app => app.user.toString() === req.params.applicantId);

        if (!applicant) {
            return res.status(404).send('Applicant not found.');
        }

        applicant.status = req.body.status;
        await job.save();

        const user = await User.findById(req.params.applicantId);
        const userJob = user.jobs.find(app => app.job.toString() === req.params.jobId);

        if (userJob) {
            userJob.status = req.body.status;
            await user.save();
        }

        res.redirect(`/jobs/${req.params.jobId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
