const mongoose = require('mongoose');
const Recipe = mongoose.model('Recipe');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');


/****************** MIDDLEWARE ******************/

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: (req, file, next) => {
        const isPhoto = file.mimetype.startsWith('image/');
        next(
            isPhoto ? null : 'Das Dateiformat wird nicht unterstützt!',
            isPhoto
        );
    }
};
/** loads a form-file with name 'photo' into memory to req.file */
exports.upload = multer(multerOptions).single('photo');


/** runs after upload-middleware.  */
exports.resize = async (req, res, next) => {

    // no photo uploaded?
    if (!req.file) return next();

    // get new filename for photo
    const extension = req.file.mimetype.split("/")[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    // resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);

    // write to disc & continue with next middleware or view
    await photo.write(`./public/uploads/${req.body.photo}`);
    next();
};

// merely a function to check the author, not a real middleware
const isAuthor = (recipe, user) => {
    if (!recipe.author.equals(user._id)) {
        throw Error('Du bist nicht Autor*in dieses Rezepts!');
    }
}

/****************** VIEWS ******************/

exports.addRecipe = (req, res) => {
    res.render('editRecipe', {title: 'Rezept anlegen'})
};

exports.createRecipe = async (req, res) => {
    req.body.author = req.user._id;
    const recipe = await (new Recipe(req.body)).save();

    req.flash('success', `Du hast das Rezept für <b>${recipe.name}</b> erfolgreich angelegt!`);
    res.redirect(`/recipe/${recipe.slug}`);
};

exports.getRecipes = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 25;
    const skip = (page -1) * limit;

    const recipesPromise = Recipe.find().sort('name').skip(skip).limit(limit);
    const countPromise = Recipe.count();
    const [recipes, count] = await Promise.all([recipesPromise, countPromise]);
    const pages = Math.ceil(count / limit);

    if (!recipes.length) {
        req.flash('info', `Seite ${page} gibt es leider nicht. Ich gebe dir stattdessen Seite ${pages}.`);
        return res.redirect(`/recipes/page/${pages}`);
    }

    res.render('recipes', { title: 'Rezepte', recipes, pagination: {page, count, pages} });
};

exports.editRecipe = async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    isAuthor(recipe, req.user);

    res.render('editRecipe', {title: `${recipe.name} bearbeiten`, recipe})
};

exports.updateRecipe = async (req, res) => {

    // TODO remove old photo from /uploads when modified

    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).exec();

    req.flash('success', `Du hast das Rezept für <b>${recipe.name}</b> erfolgreich angepasst! <a href="/recipe/${recipe.slug}">Rezept ansehen &rarr;</a>`);
    res.redirect(`/recipe/${recipe._id}/edit`);
};

exports.getRecipeBySlug = async (req, res, next) => {
    const recipe = await Recipe.findOne({slug: req.params.slug}).populate("reviews");
    if (!recipe) { return next(); }

    res.render("recipe", { title: recipe.name, recipe })
};

exports.getRecipesByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };

    const tagsPromise = Recipe.getTagsList();
    const recipesPromise = Recipe.find({ tags: tagQuery });
    const [tags, recipes] = await Promise.all([tagsPromise, recipesPromise]);

    res.render('tag', { title: 'Tags', tags, tag, recipes });
};

exports.searchRecipes = async (req, res) => {
    const recipes = await Recipe
        // find matching stores
        .find({
                $text: { $search: req.query.q }
            }, {
                score: { $meta: 'textScore' }
            })
        // sort them by 'best matching' the text query
        .sort({
            score: { $meta: 'textScore' }
        })
        // limit to 5 only
        .limit(5);

    res.json(recipes);
};

exports.heartRecipe = async (req, res) => {
    if ((await Recipe.exists({_id: req.params.id})) === null) {
        throw Error("Das Rezept gibt es nicht.");
    }
    const hearts = req.user.hearts.map(obj => obj.toString());

    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User.findOneAndUpdate(
        req.user._id,
        { [operator]: { hearts: req.params.id} },
        { new: true }
    );
    res.json(user);
};

exports.getHearts = async (req, res) => {
    const recipes = await Recipe.find({_id: { $in: req.user.hearts }});
    res.render('recipes', { title: 'Fav Rezepte', recipes });
};


exports.getTopRecipes = async (req, res) => {
    const recipes = await Recipe.getTopRecipes();
    res.render('topRecipes', { title: 'Lieblingsrezepte', recipes });
};