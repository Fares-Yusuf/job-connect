const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.userType === 'admin') {
        return next();
    }
    res.status(403).send('Access denied. Admins only.');
};

module.exports = isAdmin;
