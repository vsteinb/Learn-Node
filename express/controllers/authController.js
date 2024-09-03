const passport = require('passport');
const promisify = require('es6-promisify');
const crypto = require('crypto');
const validator = require('express-validator');
const email = require('../handlers/email');
const mongoose = require('mongoose');
const User = mongoose.model('User');


/****************** MIDDLEWARE ******************/

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) { return next(); }

    req.flash('error', 'Ooops! Dafür musst du eingeloggt sein!')
    res.redirect('/login');
};

exports.resetPasswordValidationRules = () => [
    // password
    validator.body('password').notEmpty().withMessage('Bitte gib ein Passwort an!'),
    validator.body('password-confirm').notEmpty().withMessage('Bitte wiederhole dein Passwort!'),
    validator.body('password-confirm').custom((input, {req}) => input === req.body.password).withMessage('Oops, deine Passwörter sind nicht gleich!'),
];

exports.isResetTokenValid = async (req, res, next) => {
    // get user of (unexpired) token
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    // not found
    if (!user) {
        req.flash('error', 'Reset-Token ist nicht korrekt oder abgelaufen.');
        return res.redirect('/login');
    }

    req.unauthenticatedUser = user;
    next();
};


/****************** VIEWS ******************/

// login (call both for login)
exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Login fehlgeschlagen!'
});

exports.loginSuccessRedirect = (req, res) => {
    req.flash('success', 'Du bist eingeloggt!');
    res.redirect('/');
};

// logout
exports.logout = async (req, res) => {
    const logout = promisify(req.logout, req);
    await logout().then(err => new Error(err));

    req.flash('success', 'Du bist jetzt ausgeloggt');
    res.redirect('/');
};

// forgot password
exports.forgotPassword = async (req, res) => {
    const successMessage = 'Falls zu der Email ein Account existiert, wurde die Email zum Passwort-Reset an dich versendet.';

    // get user of provided email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        req.flash('success', successMessage);
        return res.redirect('/login');
    }
    
    // set resetToken
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + (60 * 60 * 1000); // 1h == 3 600 000ms from now
    await user.save();
    
    // send email
    const resetURL = `http://${req.headers.host}/account/resetPassword/${user.resetPasswordToken}`;
    await email.send({
        subject: 'Passwort vergessen',
        user,
        resetURL,
        filename: 'password-reset'
    });

    // redirect
    req.flash('success', successMessage);
    res.redirect('/login');
};

// reset password
exports.resetPassword = async (req, res) => {
    // render password reset form
    res.render('resetPassword', { title: 'Passwort neu eingeben' })
};

// update password to db
exports.updatePassword = async (req, res) => {
    const user = req.unauthenticatedUser;

    // set new password
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);

    // remove reset-token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();

    // login user
    await req.login(updatedUser);

    // redirect
    req.flash('success', 'Du hast dein Passwort erfolgreich geändert und bist nun eingeloggt!');
    res.redirect('/');
};