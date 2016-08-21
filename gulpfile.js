const gulp = require('gulp');
const rename = require("gulp-rename");
const ts = require('gulp-typescript');
const concat = require('gulp-concat');
const fs = require('fs');
const tsUniversal = require("ts-universal");
const sourcemaps = require('gulp-sourcemaps');
const runSequence = require('run-sequence');

gulp.task('watch', function() {
   runSequence(['ts'])
   return gulp.watch(['src/**/*.ts'], ['ts']);
});

var tsProject = ts.createProject('src/tsconfig.json');

gulp.task('ts', function() {
   let result = gulp.src('src/**/*.ts')
   .pipe(sourcemaps.init())
   .pipe(ts(tsProject));

      result.dts.pipe(gulp.dest('build/definitions'));
   return result.js.pipe(tsUniversal('build/', {
         base: 'build/',
         expose: 'realm'
      }))
      .pipe(rename('realm.js'))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('build/'));
});
