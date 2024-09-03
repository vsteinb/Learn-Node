const mongoose = require('mongoose');
const validator = require('express-validator');
const promisify = require('es6-promisify');
const User = mongoose.model('User');


/****************** MIDDLEWARE ******************/

exports.registerValidationRules = () => [
    // name
    validator.body('name').escape(),
    validator.body('name').notEmpty().withMessage('Bitte gib deinen Namen an!'),
    
    // email
    validator.body('email').notEmpty().withMessage('Bitte gib deine Email-Adresse an!'),
    validator.body('email').isEmail().withMessage('Das ist keine valide Email-Adresse'),
    validator.body('email').normalizeEmail({
        gmail_convert_googlemaildotcom: true,
        gmail_remove_subaddress: true
    }),
    
    // password
    validator.body('password').notEmpty().withMessage('Bitte gib ein Passwort an!'),
    validator.body('password-confirm').notEmpty().withMessage('Bitte wiederhole dein Passwort!'),
    validator.body('password-confirm').custom((input, {req}) => input === req.body.password).withMessage('Oops, deine Passwörter sind nicht gleich!'),
];


/** check for errors during validation */
exports.validateRules = (errorHandler) => (req, res, next) => {
    const errors = validator.validationResult(req);
    // handle errors
    if (!errors.isEmpty()) {
        errors
            .formatWith(error => error.msg)
            .array()
            .forEach(error => req.flash('error', error));
        return errorHandler(req, res);
    }
    
    // assign sanitized & validated data back to req.body
    req.body = validator.matchedData(req);
    next();
};


exports.registerUser = async (req, res, next) => {
    const user = new User({ email: req.body.email, name: req.body.name });
    const register = promisify(User.register, User);
    await register(user, req.body.password);

    next();
}


/****************** VIEWS ******************/

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Registrieren' });
};

exports.account = (req, res) => {
    res.render('account', { title: 'Account bearbeiten' });
};

exports.updateAccount = async (req, res) => {
    const updates = {
        name: req.body.name,
        email: req.body.email
    };
    await User.findOneAndUpdate(
        { _id: req.user._id },
        { $set: updates },
        { runValidators: true, context: 'query' }
    );

    req.flash('success', 'Dein Account wurde angepasst!');
    res.redirect('back');
};