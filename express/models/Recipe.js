const mongoose = require('mongoose');
const slug = require('slugs');
const fs = require('fs/promises');
const path = require('path');

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
    photo: String,  // is an image name. Path leads into /public/uploads
    tags: [String],

    ingredients: {
        type: String,
        required: 'Für ein Rezept braucht es Zutaten',
        trim: true
    },
    steps: {
        type: String,
        // required: 'Bitte beschreibe wie man das zubereitet'
    },
    stepsPhoto: {
        type: String    // is an image name. Path leads into /public/uploads
    },

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
// populate reviews on recipe lookups
recipeSchema.virtual('reviews', {
    ref: 'Review',  // what model to link
    localField: '_id',   // which field on this model?
    foreignField: 'recipe'  // which field on the linked model?
});


// define indices

recipeSchema.index({
    name: 'text',
    description: 'text',
    ingredients: 'text',
})


// hooks

function autopopulate(next) {
    this.populate('reviews author');
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
recipeSchema.statics.getPagination = async function(recipesPromise = Recipe.find(), page = 1) {
    const limit = 25;
    const skip = (page -1) * limit;

    const countPromise = recipesPromise.clone().count();
    const paginatedRecipesPromise = recipesPromise.clone().skip(skip).limit(limit);
    const [recipes, count] = await Promise.all([paginatedRecipesPromise, countPromise]);
    const pages = Math.ceil(count / limit);

    return {recipes, pagination: {page, count, pages}};
};


recipeSchema.methods.removeFileOnDisk = async function(fieldname) {
    if (!['photo', 'stepsPhoto'].includes(fieldname) || !this[fieldname]) { return; }

    const photoPath = path.join(__dirname, `../public/uploads/`, this[fieldname]);
    await fs.unlink(photoPath).catch((err) => {

        // ignore error if photo does not exist
        if (err.code === 'ENOENT')
            throw Error(`Altes Foto '${fieldname}' konnte nicht gelöscht werden`);
    
        throw Error(`Problem beim Löschen des alten Fotos '${fieldname}': Errorcode ${err.code}`);
    });
}


module.exports = mongoose.model('Recipe', recipeSchema);