var gulp = require("gulp");
var babel = require("gulp-babel");
var concat = require("gulp-concat");
var concatUtil = require('gulp-concat-util');
var rename = require("gulp-rename");
var realm = require('./index.js');
var runSequence = require('run-sequence');
var uglify = require('gulp-uglify');

var spawn = require('child_process').spawn;
var node;

gulp.task('watch', function() {
   gulp.watch(['src/**/*.js'], ['build']);
});



gulp.task('server', function() {
  if (node) node.kill()
  node = spawn('node', ['app.js'], {stdio: 'inherit'})
  node.on('close', function (code) {
    if (code === 8) {
      gulp.log('Error detected, waiting for changes...');
   }
  });
});

gulp.task("build", function() {
   return gulp.src("src/realm.js")
      .on('error', function(e) {
         console.log('>>> ERROR', e.stack);
         // emit here
         this.emit('end');
      })
      .pipe(gulp.dest("./build"))
      .pipe(rename("realm.min.js"))
      .pipe(uglify())
      .pipe(gulp.dest("./build"));
});

gulp.task('start',['server'],function() {
    gulp.watch(['test-app-backend/**/*.js'], function(){
       runSequence('build-backend', 'server')
    });
});

gulp.task("build-backend", function() {
   return gulp.src("test-app-backend/**/*.js").pipe(realm.transpiler({
         preffix: "test",
         base : "test-app-backend",
         target : "./test-backend.js"
      }))
      .pipe(babel({
         presets: ["es2016"],
         plugins: ["transform-decorators-legacy"]
      }))
      .pipe(realm.transpiler({wrap : true, dev : true}))
      .pipe(gulp.dest("./"));
});
