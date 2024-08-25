const passport = require('passport');
const promisify = require('es6-promisify');


exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Login fehlgeschlagen!'
});

exports.loginSuccessRedirect = (req, res) => {
    req.flash('success', 'Du bist eingeloggt!');
    res.redirect('/');
};

exports.logout = async (req, res) => {
    const logout = promisify(req.logout, req);
    await logout().then(err => new Error(err));

    req.flash('success', 'Du bist jetzt ausgeloggt');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) { return next(); }

    req.flash('error', 'Ooops! Dafür musst du eingeloggt sein!')
    res.redirect('/login');
};