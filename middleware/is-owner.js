const isOwner = (req, res, next) => {
    const { jobId } = req.params;
    const userId = req.session.user._id;
    Job.findById(jobId)
        .then(job => {
            if (job && job.applicants.some(app => app.user.toString() === userId)) {
                return next();
            }
            res.status(403).send('Access denied.');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Internal Server Error');
        });
};
module.exports = isOwner;
