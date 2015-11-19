# Superpowers

*Powerful, extensible, cooperative. For indie game makers.*

  * Download: https://sparklinlabs.com/ and http://sparklinlabs.itch.io/superpowers
  * Documentation: http://docs.sparklinlabs.com/

## Getting started with development

  * Install [Node.js](http://nodejs.org/) 4.x and [Mercurial](http://tortoisehg.bitbucket.org/)
  * Download the boostrap script for your operating system and place it in an empty `superpowers` folder
    * On Windows, you'll want [bootstrap.cmd](http://superpowers.bitbucket.org/scripts/bootstrap.cmd)
    * On Linux or OS X, download [bootstrap.sh](http://superpowers.bitbucket.org/scripts/bootstrap.sh)
  * Run the bootstrap script. It will take a few minutes to clone the repositories and build everything.

Once it's done, run `node server/` and open `http://localhost:4237/` in your browser.

## Rebuilding all or parts of Superpowers

You can use `./scripts/build.cmd` (on Windows) or `./scripts/build.sh` (elsewhere) to rebuild all of Superpowers. You can optionally add an argument to only rebuild paths containing it.

For instance `./scripts/build.cmd supGame` will only rebuild stuff within the `supGame` folder.


## Enabling development mode

In order to catch as many runtime errors as possible while working on Superpowers,
you can run the following in your browser's console:

    localStorage.setItem("superpowers-dev-mode", "true");

When development mode is enabled, the project header in the top-left corner
will be blue. When it turns red, it's a good sign that you should
open your dev tools and look for errors in the Console tab.