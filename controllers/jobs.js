const express = require('express');
const router = express.Router();
const { User, Job } = require('../models/user.js');
const isSignedIn = require('../middleware/is-signed-in');
const isAdmin = require('../middleware/is-admin');

// Fetch all active jobs for users
router.get('/', isSignedIn, async (req, res) => {
    try {
        // Fetch jobs the user has applied to
        const userApplications = await Job.find({ 'applicants.user': req.session.user._id }).select('_id');
        const appliedJobIds = userApplications.map(job => job._id);

        // Fetch active jobs excluding the applied ones
        const activeJobs = await Job.find({ 
            status: 'active', 
            _id: { $nin: appliedJobIds } // Exclude jobs the user applied to
        });

        res.render('jobs/index.ejs', { jobs: activeJobs });
    } catch (error) {
        console.error('Error fetching active jobs:', error);
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
router.get('/my-applications', isSignedIn, async (req, res) => {
    try {
        const userApplications = await Job.find({ 'applicants.user': req.session.user._id })
            .populate('applicants.user');
        res.render('jobs/my-applications.ejs', { applications: userApplications });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).send('Internal Server Error');
    }
});

// View details of a specific job
router.get('/:jobId', isSignedIn, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId).populate('applicants.user');
        res.render('jobs/show.ejs', { job });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// View applicants for a specific job (Admins only)
router.get('/:jobId/applicants', isSignedIn, isAdmin, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId).populate('applicants.user');
        if (!job) {
            return res.status(404).send('Job not found.');
        }
        res.render('jobs/applicants.ejs', { job });
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
        // Prevent admins from applying
        if (req.session.user.userType === 'admin') {
            return res.status(403).send('Admins cannot apply for jobs.');
        }

        const job = await Job.findById(req.params.jobId);
        if (!job || job.status !== 'active') {
            return res.status(400).send('Job is not available.');
        }

        const currentUser = await User.findById(req.session.user._id);

        // Check if the user has already applied
        if (job.applicants.some(app => app.user.toString() === currentUser._id)) {
            return res.status(400).send('You have already applied to this job.');
        }

        // Add the user to the job's applicant list
        job.applicants.push({ user: currentUser._id, status: 'pending' });
        await job.save();

        // Add the job to the user's list of applied jobs
        currentUser.jobs.push({ job: job._id, status: 'pending' });
        await currentUser.save();

        res.redirect(`/jobs/`);
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

// Edit user information
router.get('/user/edit', isSignedIn, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id);
        res.render('users/edit.ejs', { user });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/user/edit', isSignedIn, async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.session.user._id,
            {
                linkedin: req.body.linkedin,
                github: req.body.github
            },
            { new: true }
        );

        req.session.user.linkedin = updatedUser.linkedin;
        req.session.user.github = updatedUser.github;

        res.redirect('/jobs');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;
