const mongoose = require('mongoose');
const Recipe = mongoose.model('Recipe');
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

/****************** VIEWS ******************/

exports.addRecipe = (req, res) => {
    res.render('editRecipe', {title: 'Rezept anlegen'})
};

exports.createRecipe = async (req, res) => {
    const recipe = await (new Recipe(req.body)).save();

    req.flash('success', `Du hast das Rezept für <b>${recipe.name}</b> erfolgreich angelegt!`);
    res.redirect(`/recipe/${recipe.slug}`);
};

exports.getRecipes = async (req, res) => {
    const recipes = await Recipe.find();
    res.render('recipes', { title: 'Rezepte', recipes })
};

exports.editRecipe = async (req, res) => {
    const recipe = await Recipe.findById(req.params.id);
    res.render('editRecipe', {title: `${recipe.name} bearbeiten`, recipe})
};

exports.updateRecipe = async (req, res) => {

    // TODO remove old photo from /uploads when modified

    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    }).exec();

    req.flash('success', `Du hast das Rezept für <b>${recipe.name}</b> erfolgreich angepasst! <a href="/recipe/${recipe.slug}">Rezept ansehen -></a>`);
    res.redirect(`/recipe/${recipe._id}/edit`);
};