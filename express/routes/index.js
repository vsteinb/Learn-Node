const express = require('express');
const router = express.Router();
const { catchErrors } = require('../handlers/errorHandlers');

const authController = require('../controllers/authController');
const recipeController = require('../controllers/recipeController');
const userController = require('../controllers/userController');


// recipe list
router.get('/', catchErrors(recipeController.getRecipes));
router.get('/recipes', catchErrors(recipeController.getRecipes));

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


// auth

// register
router.get('/register', userController.registerForm);
router.post('/register',

    // sanitize & validate form data
    userController.registerValidationRules(),
    userController.validateRules('register', 'Registrieren'),

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


module.exports = router;
