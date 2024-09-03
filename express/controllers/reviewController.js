const mongoose = require('mongoose');
const Recipe = mongoose.model('Recipe');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
    const recipe = await Recipe.exists({_id: req.params.id});
    if (recipe === null) {
        throw Error("Das Rezept gibt es nicht.");
    }

    req.body.author = req.user._id;
    req.body.recipe = recipe._id;

    const review = new Review(req.body);
    await review.save();

    req.flash('success', 'Dein Feedback ist gespeichert!');
    res.redirect('back');
};