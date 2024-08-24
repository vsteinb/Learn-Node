const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const recipeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Bitte gib einen Rezeptnamen an!'
    },
    slug: String,   // auto-generated later
    description: {
        type: String,
        trim: true
    },
    photo: String,
    tags: [String],
    // steps: {
    //     type: [String],
    //     required: 'Bitte beschreibe wie man das zubereitet'
    // },
    created: {
        type: Date,
        default: Date.now
    },
});
recipeSchema.pre('save', function(next) {

    // set 'slug' based on 'name'
    if (this.isModified('name')) {
        this.slug = slug(this.name);
    }

    // continue on
    next();
})

module.exports = mongoose.model('Recipe', recipeSchema);