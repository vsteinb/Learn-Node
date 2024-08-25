const mongoose = require('mongoose');
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
recipeSchema.pre('save', async function(next) {

    // set 'slug' based on 'name'
    if (this.isModified('name')) {
        this.slug = slug(this.name);

        // in case of same slug, append numbers like ...-1, ...-2 and so on
        const regex = new RegExp(`^(${this.slug})((-\d*)?)$`, i);
        const recipesWithSlug = await this.constructor.find({ slug: regex });
        if (recipesWithSlug.length) {
            this.slug = `${this.slug}-${recipesWithSlug.length+1}`;
        }
    }

    // continue on
    next();
})

recipeSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1}} },
        { $sort: { count: -1, _id: 1 } }
    ]);
};


module.exports = mongoose.model('Recipe', recipeSchema);