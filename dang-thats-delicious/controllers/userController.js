const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.validateRegister = (req, res, next) => {
    // name
    req.sanitizeBody('name');
    req.checkBody('name', 'You must supply a name!').notEmpty();
    
    // email
    req.checkBody('email', 'The email address is not valid!').notEmpty().isEmail();
    req.sanitizeBody('email').normalizeEmail({
        remove_dots: false,
        remove_extension: false,
        gmail_remove_subaddress: false
    });

    // password
    req.checkBody('password', 'Password cannot be blank!').notEmpty();
    req.checkBody('password-confirm', 'Password confirmation cannot be blank!').notEmpty();
    req.checkBody('password-confirm', 'Your passwords do not match').equals(req.body.password);

    // get validation errors
    const errors = req.validationErrors();
    if (errors) {
        req.flash('error', errors.map(err => err.msg));
        return res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    }

    // no errors, go on
    next();
}


exports.register = async (req, res, next) => {
    const user = new User({email: req.body.email, name: req.body.name});
    
    const register = promisify(User.register, User);
    await register(user, req.body.password);
    next();
};



exports.loginForm = (req, res) => {
    res.render('login', {title: 'Login'});
};
exports.registerForm = (req, res) => {
    res.render('register', {title: 'Register'});
};


exports.account = (req, res) => {
    res.render('account', {title: 'Edit your Account'})
};
exports.updateAccount = async (req, res) => {
    const updates = { name: req.body.name, email: req.body.email };

    await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: updates },
        { runValidators: true, context: 'query' }
    );

    req.flash('success', 'Successfully updated your account');
    res.redirect('back');
};
