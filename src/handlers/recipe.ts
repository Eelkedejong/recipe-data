import prisma from "../db";

// Get all recipes from a user
export const getRecipes = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      include: {
        recipes: true
      }
    })

    res.json({data: user.recipes})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Get one recipes based on id
export const getRecipe = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id)

    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        belongsToId: req.user.id
      }
    })

    res.json({data: recipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Create one recipe
export const createRecipe = async (req, res, next) => {
  console.log('req', req.body)
  try {
    const recipe = await prisma.recipe.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        persons: req.body.persons,
        carb: req.body.carb,
        time: req.body.time,
        ingredients: req.body.ingredients,
        belongsToId: req.user.id
      }
    })

    res.json({data: recipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Update one recipe
export const updateRecipe = async (req, res, next) => {
  try {
    const updatedRecipe = await prisma.recipe.update({
      where: {
        id_belongsToId: {
          id: parseInt(req.params.id),
          belongsToId: req.user.id
        }
      },
      data: {
        name: req.body.name,
        description: req.body.description,
        persons: req.body.persons,
        carb: req.body.carbs,
        time: req.body.time,
        ingredients: req.body.ingredients,
      }
    })

    res.json({data: updatedRecipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Delete one recipe
export const deleteRecipe = async (req, res, next) => {
  try {
    const deletedRecipe = await prisma.recipe.delete({
      where: {
        id_belongsToId: {
          id: parseInt(req.params.id),
          belongsToId: req.user.id
        }
      }
    })

    res.json({data: deletedRecipe})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}