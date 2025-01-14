const express = require('express');
const router = express.Router();
const { User, Job } = require('../models/user.js');

router.get('/', async (req, res) => {
    try {
        const activeJobs = await Job.find({ status: 'active' });
        res.render('jobs/index.ejs', {
            jobs: activeJobs
        });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

router.get('/inactive', async (req, res) => {
    try {
        const inactiveJobs = await Job.find({ status: 'inactive' });
        res.render('jobs/inactive.ejs', {
            jobs: inactiveJobs
        });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

router.get('/new', async (req, res) => {
    res.render('jobs/new.ejs');
});

router.post('/', async (req, res) => {
    try {
        // Create new job
        const newJob = await Job.create(req.body);

        // Add current user as applicant
        newJob.applicants.push({
            user: req.session.user._id,
            status: 'pending'
        });
        await newJob.save();

        // Add job to user's list
        const currentUser = await User.findById(req.session.user._id);
        currentUser.jobs.push({
            job: newJob._id,
            status: 'pending'
        });
        await currentUser.save();

        res.redirect(`/users/${currentUser._id}/jobs`);
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

router.get('/:jobId', async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId)
            .populate('applicants.user');
        const userJob = await User.findById(req.session.user._id)
            .populate('jobs.job');

        const userStatus = userJob.jobs.find(
            app => app.job._id.toString() === req.params.jobId
        )?.status;

        res.render('jobs/show.ejs', {
            job,
            userStatus
        });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

router.delete('/:jobId', async (req, res) => {
    try {
        const currentUser = await User.findById(req.session.user._id);
        currentUser.jobs = currentUser.jobs.filter(
            app => app.job.toString() !== req.params.jobId
        );
        await currentUser.save();

        const job = await Job.findById(req.params.jobId);
        if (job) {
            job.applicants = job.applicants.filter(
                app => app.user.toString() !== req.session.user._id
            );
            await job.save();
        }

        res.redirect(`/users/${currentUser._id}/jobs`);
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

router.get('/:jobId/edit', async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        res.render('jobs/edit.ejs', { job });
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

router.put('/:jobId', async (req, res) => {
    try {
        const job = await Job.findByIdAndUpdate(
            req.params.jobId,
            req.body,
            { new: true }
        );
        res.redirect(`/users/${req.session.user._id}/jobs/${req.params.jobId}`);
    } catch (error) {
        console.log(error);
        res.redirect('/');
    }
});

module.exports = router;
