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

    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'Bitte gib den Autor des Rezepts an!'
    },
    created: {
        type: Date,
        default: Date.now
    },
});

// example of a reverse lookup.
// populate reviews on store lookups
recipeSchema.virtual('reviews', {
    ref: 'Review',  // what model to link
    localField: '_id',   // which field on this model?
    foreignField: 'recipe'  // which field on the linked model?
});


// define indices

recipeSchema.index({
    name: 'text',
    description: 'text',
})


// hooks

function autopopulate(next) {
    this.populate('reviews');
    next();
};
function defaultSort(next) {
    this.sort('name');
    next();
}

recipeSchema.pre('find', defaultSort);
recipeSchema.pre('find', autopopulate);
recipeSchema.pre('findOne', autopopulate);
recipeSchema.pre('save', async function(next) {

    // set 'slug' based on 'name'
    if (this.isModified('name')) {
        this.slug = slug(this.name);

        // in case of same slug, append numbers like ...-1, ...-2 and so on
        const regex = new RegExp(`^(${this.slug})((-\d*)?)$`, 'i');
        const recipesWithSlug = await this.constructor.find({ slug: regex });
        if (recipesWithSlug.length) {
            this.slug = `${this.slug}-${recipesWithSlug.length+1}`;
        }
    }

    // continue on
    next();
});

recipeSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1}} },
        { $sort: { count: -1, _id: 1 } }
    ]);
};
recipeSchema.statics.getTopRecipes = function() {
    return this.aggregate([
        // lookup recipes & populate their reviews (like the virtual field of 'reviews')
        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'recipe', as: 'reviews' }},
    
        // filter recipes with >= 2 reviews
        { $match: { 'reviews.1': { $exists: true }} },

        // add field for avg rating
        { $addFields: { avgRating: { $avg: '$reviews.rating' } } },

        // sort desc by avg rating
        { $sort: { avgRating: -1 } },

        // limit to first 10
        { $limit: 10 }
    ]);
};


module.exports = mongoose.model('Recipe', recipeSchema);