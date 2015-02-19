# Superpowers

*Powerful, extensible, cooperative. For indie game makers.*

## Getting Superpowers

There's no packaged release yet, come back soon!

## Getting started with development

 * Install [Node.js](http://nodejs.org/) 0.12+ and [Mercurial](http://tortoisehg.bitbucket.org/)
 * Download [``bootstrap.cmd``](http://superpowers.bitbucket.org/scripts/bootstrap.cmd) (Windows) or [``bootstrap.sh``](http://superpowers.bitbucket.org/scripts/bootstrap.sh) (OS X / Linux) in an empty ``superpowers`` directory.
 * On Windows, double-click on ``bootstrap.cmd``
 * On OS X and Linux, run ``chmod u+x bootstrap.sh && ./bootstrap.sh`` in a terminal.

The script will clone the repositories and setup everything. It might take a few minutes.  
Once it's done, run ``coffee server`` and open ``http://localhost/`` in your browser.

When working on a particular part of Superpowers, run ``gulp`` where you're making changes to rebuild Jade, Stylus and CoffeeScript files on the fly.
