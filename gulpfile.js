const gulp = require('gulp');
const rename = require("gulp-rename");
const ts = require('gulp-typescript');
const concat = require('gulp-concat');
const fs = require('fs');
const tsUniversal = require("ts-universal");
const sourcemaps = require('gulp-sourcemaps');
const runSequence = require('run-sequence');
let builder = require('./build/gulp-plugin').builder;
const RealmPlugin = builder.RealmPlugin;
const DeclarationsPlugin = builder.DeclarationsPlugin;
gulp.task('watch', ['gulp-plugin', 'realm', 'example'], function() {
   
   gulp.watch(['src/realm/**/*.ts'], ['realm']);
   gulp.watch(['src/gulp-plugin/**/*.ts'], ['gulp-plugin']);
    gulp.watch(['src/example/**/*.ts'], ['example']);
});

var realmProject = ts.createProject('src/tsconfig.json');
var pluginProject = ts.createProject('src/tsconfig.json');
var exampleProject = ts.createProject('src/tsconfig.json');



gulp.task('gulp-plugin', function() {
   let result = gulp.src('src/gulp-plugin/**/*.ts')
   .pipe(sourcemaps.init())
   .pipe(ts(pluginProject));
      //result.dts.pipe(gulp.dest('build/definitions'));
   return result.js.pipe(tsUniversal('build/', {
         base: 'build/',
         expose: 'plugin'
      }))
      .pipe(rename('gulp-plugin.js'))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build/'));
});


gulp.task('realm', function() {
   let result = gulp.src('src/realm/**/*.ts')
   .pipe(sourcemaps.init())
   .pipe(ts(realmProject));
      
      result.dts.pipe(gulp.dest('build/definitions'));
   return result.js.pipe(tsUniversal('build/', {
         base: 'build/',
         expose: 'realm'
      }))
      .pipe(rename('realm.js'))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build/'));
});


gulp.task('example', function() {
   let result = gulp.src('src/example/**/*.ts')
   .pipe(sourcemaps.init())
   .pipe(ts(exampleProject))
   
   result.dts.pipe(
         DeclarationsPlugin('src/example/typings.d.ts', {
            baseDir : 'build/',
            package : 'example'
         })
      ).pipe(rename('typing.d.ts'))
       .pipe(gulp.dest('src/example/'));
     
     
   
      
});
