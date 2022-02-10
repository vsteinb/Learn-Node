const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const { catchErrors } = require('../handlers/errorHandlers');

// Stores
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

router.get('/add', authController.isLoggedIn, storeController.addStore);
router.post('/add',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.createStore));

router.get('/store/:id/edit', catchErrors(storeController.editStore));
router.post('/add/:id',
    storeController.upload,
    catchErrors(storeController.resize),
    catchErrors(storeController.updateStore));

router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

router.get('/map', catchErrors(storeController.mapPage))
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));
router.get('/top', catchErrors(storeController.getTopStores));

// User
router.get('/register', userController.registerForm);
router.post('/register',
    userController.validateRegister,
    userController.register,
    authController.login
);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));

// reset password
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token',
    authController.tokenValid,
    catchErrors(authController.reset)
);
router.post('/account/reset/:token',
    authController.tokenValid,
    authController.confirmedPasswords,
    catchErrors(authController.update)
);

// auth
router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/logout', authController.logout);


// reviews
router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));


// api
router.get('/api/v1/search', catchErrors(storeController.searchStores))
router.get('/api/v1/stores/near', catchErrors(storeController.mapStores))
router.post('/api/v1/stores/:id/heart', catchErrors(storeController.heartStore))


module.exports = router;
