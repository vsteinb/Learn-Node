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
/** loads a form-files into memory to req.file */
exports.upload = multer(multerOptions).fields([
    { name: 'photo', maxCount: 1 },
    { name: 'stepsPhoto', maxCount: 1 },
]);


/** runs after upload-middleware. Resizes and saves file in req.file to disk and saves reference in provided fieldname */
exports.resize = async (req, res, next) => {

    // no photo uploaded?
    if (!req.files) return next();

    for (const fieldname of Object.keys(req.files)) {
        const file = req.files[fieldname][0];

        // get new filename for photo
        const extension = file.mimetype.split("/")[1];
        req.body[fieldname] = `${uuid.v4()}.${extension}`;

        // resize
        const photo = await jimp.read(file.buffer);
        await photo.resize(800, jimp.AUTO);

        // write to disc & continue with next middleware or view
        await photo.write(`./public/uploads/${req.body[fieldname]}`);
    }

    next();
};

exports.removeOldPhotos = async (req, res, next) => {
    const recipe = await Recipe.findById(req.params.id);
    
    // remove old photo from ../public/uploads when modified
    if (recipe?.photo && req.body.photo && recipe.photo !== req.body.photo) {
        await recipe.removeFileOnDisk('photo');
    }
    if (recipe?.stepsPhoto && req.body.stepsPhoto && recipe.stepsPhoto !== req.body.stepsPhoto) {
        await recipe.removeFileOnDisk('stepsPhoto');
    }

    next();
};


// merely a function to check the author, not a real middleware
const isAuthor = (recipe, user) => {
    if (!recipe.author._id.equals(user._id)) {
        throw Error('Du bist nicht Autor*in dieses Rezepts!');
    }
};

/****************** VIEWS ******************/

exports.addRecipe = (req, res) => {
    res.render('editRecipe', {title: 'Rezept anlegen'})
};

exports.createRecipe = async (req, res) => {
    req.body.author = req.user;

    let recipe;
    try {
        recipe = await (new Recipe(req.body)).save();
    } catch (err) {
        const errorKeys = Object.keys(err.errors);
        errorKeys.forEach(key => req.flash('error', err.errors[key].message));
        return res.render('editRecipe', {title: 'Rezept anlegen', recipe: req.body, flashes: req.flash()});
    }

    req.flash('success', `Du hast das Rezept für <b>${recipe.name}</b> erfolgreich angelegt!`);
    res.redirect(`/recipe/${recipe.slug}`);
};

exports.getRecipes = async (req, res) => {
    const context = await Recipe.getPagination(Recipe.find(), req.params.page);
    if (!context.recipes.length) {
        req.flash('info', `Seite ${context.pagination.page} gibt es leider nicht. Ich gebe dir stattdessen Seite ${context.pagination.pages}.`);
        return res.redirect(`/recipes/page/${context.pagination.pages}`);
    }

    res.render('recipes', { title: 'Rezepte', ...context });
};

exports.editRecipe = async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    isAuthor(recipe, req.user);

    res.render('editRecipe', {title: `${recipe.name} bearbeiten`, recipe})
};

exports.updateRecipe = async (req, res) => {
    let recipe;
    try {
        recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).exec();
    } catch (err) {
        const errorKeys = Object.keys(err.errors);
        errorKeys.forEach(key => req.flash('error', err.errors[key].message));

        recipe = await Recipe.findById(req.params.id);
        return res.render('editRecipe', {title: `${recipe?.name || 'Rezept'} bearbeiten`, recipe: req.body, flashes: req.flash()});
    }

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
        // find matching recipes
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
    const context = await Recipe.getPagination(Recipe.find({_id: { $in: req.user.hearts }}), req.params.page);

    if (!context.recipes.length) {
        req.flash('info', `Seite ${context.pagination.page} gibt es leider nicht. Ich gebe dir stattdessen Seite ${context.pagination.pages}.`);
        return res.redirect(`/hearts/page/${context.pagination.pages}`);
    }

    res.render('recipes', { title: 'Fav Rezepte', ...context });
};


exports.getTopRecipes = async (req, res) => {
    const recipes = await Recipe.getTopRecipes();
    res.render('topRecipes', { title: 'Lieblingsrezepte', recipes });
};