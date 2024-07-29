# Mijn Kookboek (My Cookbook)

Live environment: [mijn-kookboek.nl](https://mijn-kookboek.nl)

Your personal cookbook! Create an account and start adding your recipes or explore new recipes. Automatically create shopping lists with the required ingredients and make grocery shopping easier than ever.

Check out the demo account:

- Username: demo
- Password: demo

Note: This project is still work in progress and not all features work as intended yet.

## About The Project

This project contains the API's and db interaction for the cookbook project

[https://github.com/Eelkedejong/recipe-shopping-list](Front-end repository)


## Project structure

- The server.ts contains the server configuration and API route configuration for the server.
- Middleware modules are used to handle authentication, api rate limiting and input error handling.
- Individual API routers for the core components (recipes and shopping lists) are defined in the routers folder, both for the public and user-related data.
- The handlers folder contain the function that are triggered when a call to the router is made. Prisma is used to interact with the database based on parameters send with the API call.

## Tech Stack

- The project is build in *node.js*.
- The server is build using the *Express* framework.
- The data is stored in a *ProgresSQL* database.
- *Prisma* is used to interact with the database.
- Authentication is done using *bcrypt* and *jsonwebtokens*. 

## Development

Development is currently still done by me. In order to run locally, the project relies on several enviroment variables that are not publiclly avaible.

## Contact

Eelke de Jong - eelkesdejong@gmail.com - [eelke.me](https://eelke.me)

Project Link: [https://github.com/Eelkedejong/recipe-shopping-list](https://github.com/Eelkedejong/recipe-shopping-list)



[contributors-shield]: https://img.shields.io/github/contributors/Eelkedejong/repo_name.svg?style=for-the-badge&colorB=555
[contributors-url]: https://github.com/Eelkedejong/
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://www.linkedin.com/in/eelke-de-jong/
