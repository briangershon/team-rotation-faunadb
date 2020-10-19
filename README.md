# team-rotation-faunadb

Keep track of active team member, and pick next person to be active on a rotating basis. Data stored in FaunaDB.

For example, each week, pick a new person on the team to merge Renovate PRs.

Ensures each person goes in order and tracks how many times person was picked.

## How to run tests

These tests run against a live test FaunaDB database.

First, create a new FaunaDB database and setup a key with `server` role for that database. Use key below:

    # create collections and indexes
    FAUNADB_SECRET="" npm run create-database

    # run tests
    FAUNADB_SECRET="" npm test

## How to use this package in your own application

    # create your own personal github token with `repo` and `read:packages` scopes
    # and use it as your password in the next step:
    npm login --registry=https://npm.pkg.github.com --scope=@briangershon
    npm install @briangershon/team-rotation-faunadb

## To release new version of this package

    Ensure you add `FAUNDAB_SECRET` as a Github Secret in this repo so Github Actions run tests ok.

    npm version patch -s -m "my release"
    # `postversion` hook will then push to Github
    
    Create a release on Github.com to trigger publish action.
