# The original Knight's Tour (2015)

This is the first version of the game, written by Joel E. Mason around 2015 for freethecube.com and later hosted at
blog.joelemason.com/kt. It is kept as it was, apart from a short header comment added to `files/game.js` in 2026. The game in
this repository's `src/` folder was rebuilt from it.

What is here:

- `index.html` (saved from the original page, `tour_embed.php`; its footer credits the knight image to Cliparts.co), `files/game.js` (all of the game: 875 lines of jQuery),
  `files/cleangame.min.css`, `pics/` (the Classic pictures) and `favicon.ico`.
- Third-party libraries it used, unchanged, each under its own licence: jQuery 3.6.0 (`files/jquery.js`, MIT,
  jquery.org/license), Underscore.js 1.8.3 (`files/underscore-min.js`, MIT) and Bootstrap 3.3.5 (`bootstrap/js/bootstrap.min.js`,
  MIT).
- `files/anicolorsmin.js`: a small jQuery plugin that lets `animate()` fade colours (the red flash on a wrong move). It was picked up
  from the web at the time; this copy carries no author or licence notice. Its colour-name table matches John Resig's 2007 "Color
  Animations" jQuery plugin, so it is probably a later rewrite of that for jQuery 1.8+. It is kept so the original stays whole.

It was written for its old home: `game.js` builds image paths from `https://<host>/kt/`, so the pictures load only when the folder is
served at `/kt/` on an HTTPS site. It is here to be read more than run.

Copyright 2015-2026 Joel E. Mason. Apache-2.0, see [../LICENSE](../LICENSE). The third-party files keep their own licences.
