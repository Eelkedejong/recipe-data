import prisma from "../db";
import { Request, Response, NextFunction } from 'express';

// Create Shopping list. This is called when a new user is created.
export const createShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  console.log('req', req.body)
  try {
    const list = await prisma.shoppingList.create({
      data: {
        recipes: req.body.recipes,
        items: req.body.items,
        belongsToId: req.user.id
      }
    })

    res.json({data: list})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Get the shopping list
export const getShoppingList = async (req, res, next) => {
  try {

    const list = await prisma.shoppingList.findFirst({
      where: {
        belongsToId: req.user.id
      }
    })

    res.json({data: list})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}

// Update the shopping list
export const updateShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the existing shopping list
    const shoppingList = await prisma.shoppingList.findFirst({
      where: {
        belongsToId: req.user.id
      }
    });

    // Track the recipes that need to be added to the shopping list
    let newRecipes = [];
 
    // Compare the recipes in the request body with the recipes in the shopping list
    console.log('shoppingList', shoppingList.recipes);

    // If the shopping list is empty, add all the recipes from the request body to the newRecipes list
    if (shoppingList.recipes.length === 0) {
      newRecipes = req.body.recipes;
    } else {
      // If the shopping list is not empty, compare the recipes in the request body with the recipes in the shopping list
      req.body.recipes.map((recipe: { id: number, persons: number }) => {
        // create a list of recipe ids from the shoppingList recipes
        const recipeIds = shoppingList.recipes.map((recipe: { id: number }) => recipe.id);

        // check if the recipe id is in the recipeIds list. If it is not, add it to the newRecipes list
        if (!recipeIds.includes(recipe.id)) {
          newRecipes.push(recipe);
        }
      });
    }

    // Track the ingredients that need to be added to the shopping list
    let newIngredients = [];

    // Get the ingredients from the newRecipes list
    await Promise.all(
      newRecipes.map(async (recipe: { id: number, persons: number }) => {
        console.log('recipe', recipe.id);
        const recipeIngredients = await prisma.recipe.findUnique({
          where: {
            id: recipe.id
          },
          select: {
            persons: true,
            ingredients: true
          }
        });

        // Multiply the ingredient amounts by the number of persons
        if (Array.isArray(recipeIngredients.ingredients)) {
          recipeIngredients.ingredients.forEach((ingredient: { amount: number, ingredient: string }) => {
            if (recipe.persons !== recipeIngredients.persons) {
              ingredient.amount = ingredient.amount * (recipe.persons / recipeIngredients.persons);
            }

            // Check if the ingredient already exists in the newIngredients list
            const existingIngredient = newIngredients.find((newIngredient) => newIngredient.ingredient === ingredient.ingredient);

            if (existingIngredient) {
              // If the ingredient already exists, add the amounts together
              existingIngredient.amount += ingredient.amount;
            } else {
              // If the ingredient doesn't exist, add it to the newIngredients list
              newIngredients.push(ingredient);
            }
          });
        } else {
          // Handle the case where recipeIngredients.ingredients is not an array
          console.log('recipeIngredients.ingredients is not an array');
        }
      })
    ) as any[]; // ToDo: Add type assertion here

    console.log('newIngredients', newIngredients);

    // Convert the ingredients to a string, starting with the amound, then the unit, then the ingredient
    newIngredients = newIngredients.map((ingredient) => {
      return `${ingredient.amount} ${ingredient.unit} ${ingredient.ingredient}`;
    });

    console.log('newIngredients', newIngredients);

    // Add the new recipes and ingredients to the shopping list
    const updatedList = await prisma.shoppingList.update({
      where: {
        belongsToId: req.user.id
      },
      data: {
        recipes: {
          push: newRecipes
        }
      }
    });

    // Return the updated shopping list
    res.json({ data: updatedList });
  } catch (e) {
    e.type = 'next';
    next(e);
  }
};




// Update the shopping list
export const updateShoppingListOld = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedList = await prisma.shoppingList.update({
      where: {
        belongsToId: req.user.id
      },
      data: {
        recipes: req.body.recipes,
        items: req.body.items
      }
    })

    res.json({data: updatedList})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}
 
// Delete the Shopping list. Should be called when a user is deleted.
export const deleteShoppingList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deletedList = await prisma.shoppingList.delete({
      where: {
        belongsToId: req.user.id
      }
    })

    res.json({data: deletedList})
  } catch (e) {
    e.type = 'next'
    next(e)
  }
}



