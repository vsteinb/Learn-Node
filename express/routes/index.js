const express = require('express');
const router = express.Router();
const { catchErrors } = require('../handlers/errorHandlers');

const authController = require('../controllers/authController');
const recipeController = require('../controllers/recipeController');
const reviewController = require('../controllers/reviewController');
const userController = require('../controllers/userController');


// recipe list
router.get('/', catchErrors(recipeController.getRecipes));
router.get('/recipes', catchErrors(recipeController.getRecipes));
router.get('/recipes/page/:page', catchErrors(recipeController.getRecipes));

// create recipe
router.get('/add',
    authController.isLoggedIn,
    recipeController.addRecipe
);
router.post('/add',
    authController.isLoggedIn,
    recipeController.upload,
    catchErrors(recipeController.resize),
    catchErrors(recipeController.createRecipe)
);

// update recipe
router.get('/recipe/:id/edit', catchErrors(recipeController.editRecipe));
router.post('/add/:id',
    recipeController.upload,
    catchErrors(recipeController.resize),
    catchErrors(recipeController.updateRecipe)
);

// recipe detail
router.get('/recipe/:slug', catchErrors(recipeController.getRecipeBySlug));

// tags page
router.get('/tags', catchErrors(recipeController.getRecipesByTag));
router.get('/tags/:tag', catchErrors(recipeController.getRecipesByTag));


// hearted recipes page
router.get('/hearts',
    authController.isLoggedIn,
    catchErrors(recipeController.getHearts)
);

// top recipes page
router.get('/top', catchErrors(recipeController.getTopRecipes))


// auth

// register
router.get('/register', userController.registerForm);
router.post('/register',

    // sanitize & validate form data
    userController.registerValidationRules(),
    userController.validateRules((req, res) => res.render('register', { title: 'Registrieren', body: req.body, flashes: req.flash() })),

    // register the new user
    catchErrors(userController.registerUser),

    // controller: login
    authController.login,
    authController.loginSuccessRedirect
);

// login
router.get('/login', userController.loginForm);
router.post('/login',
    authController.login,
    authController.loginSuccessRedirect
);

// logout
router.get('/logout',
    authController.isLoggedIn,
    catchErrors(authController.logout)
);

// forgot password: send password reset email
router.post('/account/forgotPassword', catchErrors(authController.forgotPassword));

// reset password with token
router.get('/account/resetPassword/:token',
    // check resetToken
    catchErrors(authController.isResetTokenValid),

    // render password reset form
    catchErrors(authController.resetPassword)
);
// save newly resetted password
router.post('/account/resetPassword/:token',
    // check resetToken
    catchErrors(authController.isResetTokenValid),

    // sanitize & validate form data
    authController.resetPasswordValidationRules(),
    userController.validateRules((req, res) => res.redirect('back')),

    // set new password to db
    catchErrors(authController.updatePassword)
);

// user account
router.get('/account',
    authController.isLoggedIn,
    userController.account
);
router.post('/account',
    authController.isLoggedIn,
    catchErrors(userController.updateAccount)
);


// leave a review
router.post('/review/:id',
    authController.isLoggedIn,
    catchErrors(reviewController.addReview)
);



/************* API ***************/

router.get('/api/v1/searchRecipes', catchErrors(recipeController.searchRecipes));
router.post('/api/v1/recipe/:id/heart',
    authController.isLoggedIn,
    catchErrors(recipeController.heartRecipe)
);

module.exports = router;
