const mongoose = require('mongoose');
const validator = require('validator');
const passportLocalMongoose = require('passport-local-mongoose');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const md5 = require('md5');


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
        validate: [validator.isEmail, 'keine valide Email-Adresse'],
        required: 'Bitte gib deine Email an!'
    },
    name: {
        type: String,
        required: 'Bitte gib einen Username an!',
        trim: true
    }
});

userSchema.virtual('gravatar').get(function() {
    return `https://gravatar.com/avatar/${md5(this.email)}?s=200`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);