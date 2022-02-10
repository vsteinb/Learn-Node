const passport = require('passport');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');
const mongoose = require('mongoose');
const User = mongoose.model('User');

exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error', 'You must be logged in for that!');
    res.redirect('/login');
};

exports.confirmedPasswords = (req, res, next) => {
    if (req.body.password && req.body.password === req.body['password-confirm']) {
        return next();
    }

    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};
exports.tokenValid = async (req, res, next) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/login');
    }

    next();
}




exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in'
});

exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
};

exports.forgot = async (req, res) => {
    const user = await User.findOne({email: req.body.email});

    if (!user) {
        req.flash('success', 'A password reset has been mailed to you if a corresponding account exists.');
        return res.redirect('/login');
    }

    // update user
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpires = Date.now() + (1000 * 60 * 60); // now + 1h
    await user.save();

    // send email
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    await mail.send({
        user,
        subject: 'Password Reset',
        // render pug:
        resetURL,
        filename: 'password-reset'
    });

    req.flash('success', 'A password reset has been mailed to you if a corresponding account exists.');
    res.redirect('/login');
};
exports.reset = async (req, res) => {
    res.render('reset', { title: 'Reset your Password' })
};

exports.update = async (req, res) => {
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });

    // update user
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    const updatedUser = await user.save();

    await req.login(updatedUser);

    req.flash('success', 'Your password has been reset!')
    res.redirect('/');
};