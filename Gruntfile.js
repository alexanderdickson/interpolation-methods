/*global module:false*/

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        stripBanners: true,
         banner: '/*! <%= pkg.name %> - <%= pkg.author %> */'
      },
      dist: {
        src: 'bundle.js',
        dest: 'dist/bundle.js'
      }
    },
    uglify: {
      build: {
        src: ['bundle.js'],
        dest: 'dist/bundle.min.js'
      }
    },
    watch: {
      files: 'interpolate.js',
      tasks: ['browserify']
    },
    jshint: {
      files: ['interpolate.js'],
      options: {
        curly: true,
        eqeqeq: false,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true
      }
    },
    browserify: {
      basic: {
        src: ['interpolate.js'],
        dest: 'bundle.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('observe', ['concat', 'browserify']);
  // Default task.
  grunt.registerTask('default', ['jshint', 'browserify', 'concat', 'uglify']);

};
