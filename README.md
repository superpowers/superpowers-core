# Superpowers

*Powerful, extensible, cooperative. For indie game makers.*

  * Download: https://sparklinlabs.com/ and http://sparklinlabs.itch.io/superpowers
  * Documentation: http://docs.sparklinlabs.com/

## Getting started with development

  * Install [Node.js](http://nodejs.org/) 0.12+ and [Mercurial](http://tortoisehg.bitbucket.org/)
  * Download the boostrap script for your operating system and place it in an empty `superpowers` folder
    * On Windows, you'll want [bootstrap.cmd](http://superpowers.bitbucket.org/scripts/bootstrap.cmd)
    * On Linux, download [bootstrap.sh](http://superpowers.bitbucket.org/scripts/bootstrap.sh)
  * Run the bootstrap script. It will take a few minutes to clone the repositories and build everything.

Once it's done, run `node server/` and open `http://localhost:4237/` in your browser.

When working on a particular part of Superpowers, run ``gulp``
where you're making changes to rebuild Jade, Stylus and TypeScript files on the fly.

## Enabling development mode

In order to catch as many runtime errors as possible while working on Superpowers,
you can run the following in your browser's console:

    localStorage.setItem("superpowers-dev-mode", "true");

When development mode is enabled, the project header in the top-left corner
will be blue. When it turns red, it's a good sign that you should
open your dev tools and look for errors in the Console tab.
