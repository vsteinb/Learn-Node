const express = require('express');
const router = express.Router();
const { catchErrors } = require('../handlers/errorHandlers');


const recipeController = require('../controllers/recipeController');

// Do work here
router.get('/', catchErrors(recipeController.getRecipes));
router.get('/recipes', catchErrors(recipeController.getRecipes));

router.get('/add',recipeController.addRecipe);
router.post('/add',
    recipeController.upload,
    catchErrors(recipeController.resize),
    catchErrors(recipeController.createRecipe)
);

router.get('/recipe/:id/edit', catchErrors(recipeController.editRecipe));
router.post('/add/:id',
    recipeController.upload,
    catchErrors(recipeController.resize),
    catchErrors(recipeController.updateRecipe)
);

module.exports = router;
