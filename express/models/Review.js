const mongoose = require('mongoose');
const mongodbErrorHandler = require('mongoose-mongodb-errors');

const reviewSchema = new mongoose.Schema({
    created: {
        type: Date,
        default: Date.now
    },
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'Bitte gib den Autor an!'
    },
    recipe: {
        type: mongoose.Schema.ObjectId,
        ref: 'Recipe',
        required: 'Bitte gib das Rezept an!'
    },
    text: {
        type: String,
        required: 'Bitte schreib doch noch was',
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
});

function autopopulate(next) {
    this.populate('author');
    next();
}

function defaultSort(next) {
    this.sort('-created');
    next();
}

reviewSchema.pre('find', defaultSort);
reviewSchema.pre('find', autopopulate);
reviewSchema.pre('findOne', autopopulate);



reviewSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('Review', reviewSchema);