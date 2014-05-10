(function () {
    var root = this;

    defineBundledLibraries();
    loadPluginsAndBoot();

    function defineBundledLibraries() {
        // These are already loaded via bundles.  
        // We define them and put them in the root object. 
        /*define('jquery', [], function () { return root.jQuery; });
        define('jqueryui', ['jquery'], function ($) { return root.jQuery.ui; });
        define('angular', [], function () { return root.angular; });
        define('uibootstrap', ['angular'], function ($) { return root.angular; });
        define('ngResource', ['jquery'], function ($) { return root.angular; });
        define('amplifyStore', [], function () { return root.amplify; });
        define('ngUpload', ['angular'], function () { return root.angular; });
        define('angularRoute', ['angular'], function () { return root.angular; });*/
    }

    function loadPluginsAndBoot() {

        require.config({
            baseUrl: '/scripts/',
            paths: {
                angular: './lib/angular',
                ngUpload: './lib/ngUpload',
                ngResource:'./lib/ngResource',
                angularRoute:'./lib/angularRoute',
                uibootstrap:'./lib/uibootstrap',
                pace:'./lib/pace',
                stackTrace:'./lib/stackTrace',
                amplifyStore:'./lib/amplifyStore',
                jquery:'./lib/jquery',
                jqueryui:'./lib/jqueryui',
                app: './app/app',
                controllers: './app/controllers',
                services: './app/services',
                configuration: './app/configuration',
                directives: './app/directives',
                editorSpecifications: './app/editorSpecifications'
            },
            shim:{
                'amplifyStore':{
                    exports:'amplify'
                },
                'angular':{
                    deps:['jquery'],
                    exports:'angular'
                },
                'uibootstrap':{
                    deps:['angular']
                },
                'ngUpload':{
                    deps:['angular']
                },
                'ngResource':{
                    deps:['angular']
                },
                'angularRoute':{
                    deps:['angular']
                }
            }
        });

        require(['angular','app','pace'],
            function (angular, app, pace) {
                angular.element(document).ready(function () {
                    angular.bootstrap(angular.element('#editor-app'), ['editor']);            
                });
            }
        );
    }
})();


//require.config({
//    baseUrl: 'NewEditor/scripts/lib',
//    paths: {
//        jquery: 'http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min',
//        jqueryui: 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min',
//        app: './../app/app',
//        controllers: './../app/controllers',
//        services: './../app/services',
//        configuration: './../app/configuration',
//        directives: './../app/directives',
//        ngResource: 'angular-resource.1.1.5', //'angular-resource.min'
//        amplifyStore: 'amplify.store.min',
//        angular: 'angular.1.1.5',
//        editorSpecifications: './../app/editorSpecifications',
//        uibootstrap: 'ui-bootstrap-0.4.0',
//        jqueryForm:'jquery.form',
//        ngUpload: 'ng-upload'
//    },
//    shim: {
//        angular: {
//            deps: ['jquery'],
//            exports: 'angular'
//        },
//        ngResource: {
//            deps: ['angular']
//        },
//        jqueryui: {
//            deps: ['jquery']
//        },
//        amplifyStore: {
//            exports: 'amplify'
//        },
//        uibootstrap: {
//            deps: ['angular']
//        },
//        jqueryForm: {
//            deps: ['jquery']
//        },
//        ngUpload: {
//            deps: ['angular']
//        }
//    }
//});

//require(['angular','app'],
//    function (angular, app) {
//        angular.element(document).ready(function () {
//            angular.bootstrap(angular.element('#editor-app'), ['editor']);            
//        });
//    }
//);