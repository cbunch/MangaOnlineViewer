import gulp from 'gulp';
import file from 'gulp-file';
import beautify from 'gulp-jsbeautify';
import preprocess from 'gulp-preprocess';
import userscript from 'userscript-meta';
import {
  rollup,
} from 'rollup';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';
import eslint from 'rollup-plugin-eslint';
import cleanup from 'rollup-plugin-cleanup';
import R from 'ramda';
import fs from 'fs';
import metaMain from './src/meta-main';
import metaAdult from './src/meta-adult';
import {
  mangaSites,
  comicSites,
  hentaiSites,
} from './src/readme';
import pkg from './package.json';

const scripts = {
  main: {
    entry: 'userscript-main.js',
    name: 'Manga_OnlineViewer.user.js',
    meta: 'Manga_OnlineViewer.meta.js',
    sitesFolder: './src/main',
  },
  adult: {
    entry: 'userscript-adult.js',
    name: 'Manga_OnlineViewer_Adult.user.js',
    meta: 'Manga_OnlineViewer_Adult.meta.js',
    sitesFolder: './src/adult',
  },
};

function buildUserscript(entryFile, destFile, metaFile) {
  return rollup({
    entry: entryFile,
    external: R.keys(pkg.dependencies),
    plugins: [
      commonjs(), // {namedExports: {'./src/sites-metaAdult.js': ['sites']}}),
      eslint(),
      babel({
        babelrc: false,
        presets: [
          [
            'airbnb', {
              modules: false,
              targets: {
                node: 7,
              //   chrome: 59,
              //   opera: 46,
              //   firefox: 52,
              //   safari: 10,
              //   edge: 14,
              },
            },
          ],
        ],
        plugins: [
          'external-helpers',
        ],
        exclude: 'node_modules/**',
      }),
      cleanup({
        comments: 'none',
        normalizeEols: 'win',
      }),
    ],
  }).then(bundle => bundle.write({
    banner: fs.readFileSync(metaFile, 'utf8'),
    intro: 'var W = (typeof unsafeWindow === undefined) ? window : unsafeWindow;',
    format: 'iife',
    dest: destFile,
    globals: {
      'color-scheme': 'ColorScheme',
      jquery: '$',
      jscolor: 'jscolor',
      jszip: 'JSZip',
      nprogress: 'NProgress',
      ramda: 'R',
      sweetalert: 'swal',
    },
    // sourceMap: 'inline',
  }));
}
gulp.task('build', ['build:main', 'build:adult', 'readme'], () =>
  gulp.src('./dist/*.js')
    .pipe(beautify({
      indent_size: 2,
    }))
    .pipe(gulp.dest('./dist/')));
gulp.task('build:main', ['build:meta-main'], () =>
  buildUserscript(`src/${scripts.main.entry}`, `dist/${scripts.main.name}`,
    `./dist/${scripts.main.meta}`));
gulp.task('build:adult', ['build:meta-adult'], () =>
  buildUserscript(`src/${scripts.adult.entry}`,
    `dist/${scripts.adult.name}`, `./dist/${scripts.adult.meta}`));
gulp.task('build:meta-main', () =>
  file(scripts.main.meta, userscript.stringify(metaMain), { src: true }).pipe(gulp.dest('dist')));
gulp.task('build:meta-adult', () =>
  file(scripts.adult.meta, userscript.stringify(metaAdult), { src: true }).pipe(gulp.dest('dist')));
gulp.task('readme', () => {
  gulp.src('./src/readme.md')
    .pipe(preprocess({
      context: {
        LIST_MANGA_SITES: mangaSites,
        LIST_COMIC_SITES: comicSites,
        LIST_HENTAI_SITES: hentaiSites,
      },
    })) // To set environment variables in-line
    .pipe(gulp.dest('./dist/'));
});
gulp.task('watch', () => {
  gulp.watch(['./src/**/*.js'], ['build']);
});
gulp.task('release', ['build'], () => {
  gulp.src('dist/**.*').pipe(gulp.dest('./'));
});
