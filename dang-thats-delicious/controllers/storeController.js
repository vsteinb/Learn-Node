const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: (req, file, next) => {
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) { next(null, true); }
        else { next({message: "That file type is not allowed!"}, false); }
    }
};


exports.upload = multer(multerOptions).single('photo');
exports.resize = async (req, res, next) => {
    if (!req.file) { return next(); }

    const extension = req.file.mimetype.split("/")[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    // resize & save
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);

    next();
};





exports.addStore = (req, res) => {
    res.render('editStore', {title: 'Add Store'});
}
exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
    const page = req.params.page || 1;
    const limit = 4;
    const skip = (page * limit) - limit;

    const countPromise = Store.count();
    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit)
        .sort({created: 'desc'});

    const [count, stores] = (await Promise.allSettled([countPromise, storesPromise]))
        .map(result => (result.status === 'fulfilled' ? result.value : undefined));

    const pages = Math.ceil(count / limit);

    if (!stores.length && skip) {
        req.flash('info', `Page ${page} doesn't exist. So I put you on page ${pages}`);
        return res.redirect(`/stores/page/${pages}`);
    }
    res.render('stores', {title: 'Stores', stores, count, pages, page});
}
exports.getStoreBySlug = async (req, res, next) => {
    const store = await (await Store.findOne({slug: req.params.slug})).populate('reviews');
    if (!store) { return next(); }

    res.render('store', {title: store.name, store});
}

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own a store in order to edit it!');
    }
};
exports.editStore = async (req, res, next) => {
    const store = await Store.findOne({_id: req.params.id});
    if (!store) { return next(); }
    confirmOwner(store, req.user);

    res.render('editStore', {title: `Edit ${store.name}`, store});
}
exports.updateStore = async (req, res) => {
    req.body.location.type = 'Point';

    const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
        new: true,  // return the updated store
        runValidators: true
    }).exec();

    req.flash('success', `Successfully updated ${store.name}. <a href="/stores/${store.slug}">View Store</a>`);
    res.redirect(`/store/${store._id}/edit`);
}


exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };

    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({tags: tagQuery});
    const [tags, stores] = (await Promise.allSettled([tagsPromise, storesPromise]))
        .map(result => (result.status === 'fulfilled' ? result.value : undefined));

    res.render('tag', { title: "Tags", tag, tags, stores });
}

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    res.render('topStores', {title: `★ Top ${stores.length} Stores!`, stores})
};


exports.mapPage = (req, res) => {
    res.render('map', { title: "Map" })
};
exports.getHearts = async (req, res) => {
    const stores = await Store.find({_id: { $in: req.user.hearts }});

    res.render('stores', {title: "Hearted Stores", stores});
};



// api
exports.searchStores = async (req, res) => {
    const stores = await Store
    .find({
        $text: {
            $search: req.query.q,
        }
    }, {
        score: { $meta: 'textScore' }
    })
    .sort({
        score: { $meta: 'textScore' }
    })
    .limit(5);

    res.json(stores)
};

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(d => parseFloat(d));
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000 // 10km radius (in m)
            }
        }
    };

    const stores = await Store
        .find(q)
        .select('description name location slug photo')
        .limit(10);

    res.json(stores);
};

exports.heartStore = async (req, res, next) => {
    const store = await Store.findOne({_id: req.params.id });
    if (!store) { return next(); }

    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    
    const user = await User.findByIdAndUpdate(req.user._id,
        {[operator] : { hearts: req.params.id }},
        { new: true, runValidators: true }
    );

    res.json(user);
};