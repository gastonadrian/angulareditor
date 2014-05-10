/* App Module */
define('app',
    ['angular', 'services', 'configuration', 'directives', 'uibootstrap', 'controllers', 'ngUpload', 'editorSpecifications', 'stackTrace', 'angularRoute'],
    function (angular, services, configuration, directives, uibootstrap, controllers, ngUpload, contextualDirectives, stackTrace, ngRoute) {
        'use strict';
        
        return angular
            .module('editor', ['ngRoute', 'editor.services', 'editor.directives', 'ui.bootstrap', 'editor.controllers', 'ngUpload', 'contextualDirectives'])
            .config(['$routeProvider', '$httpProvider', '$provide', '$sceProvider',
                function ($routeProvider, http, provide, $sceProvider) {

                    $sceProvider.enabled(false);

                    /* Configure exception handling*/
                    provide.decorator("$exceptionHandler", [
                        '$delegate',
                        function ($delegate) {
                            return function (exception, cause) {

                                $delegate(exception, cause);
                                window.errorHandler(exception, cause, null, null);
                            };
                        } ]);

                    /* End exception handling */

                    angular.forEach(configuration.steps, function (element) {
                        $routeProvider.when(element.url, { templateUrl: element.templateUrl, controller: element.controller });
                    });
                    $routeProvider.otherwise({ redirectTo: configuration.steps[0].url });

                    http.interceptors.push('requestInterceptor');
                }
             ])
             .run([
                 '$window',
                 '$rootScope',
                function (global, $rootScope) {

                    $rootScope.safeApply = function(fn) {
                        var phase = this.$root.$$phase;
                        if (phase == '$apply' || phase == '$digest') {
                            if (fn && (typeof(fn) === 'function')) {
                                fn();
                            }
                        } else {
                            this.$apply(fn);
                        }
                    };

                    //cross browser outer html support
                    $.fn.outerHTML = function (s) {
                        if (!$(s).length) {
                            return false;
                        }
                        return $(s).clone().wrap('<p>').parent().html();
                    };

                    global.onerror = function (errorMsg, url, lineNumber) {

                        var exception = {
                            url: url,
                            lineNumber: lineNumber
                        };

                        global.errorHandler(exception, errorMsg, null, null);
                    };

                    global.errorHandler = function (exception, cause, callback, errorCallback) {

                        var stack = stackTrace({ e: exception });

                        var exceptionData = {
                            fileName: exception.url,
                            message: cause || exception.message || exception.description,
                            lineNumber: exception.lineNumber,
                            columnNumber: exception.columnNumber,
                            stackTrace: stack.join('\n'),
                            Url: window.location.href
                        };

                        $.ajax({
                            method: 'POST',
                            url: '/api/applications',
                            data: exceptionData,
                            dataType: 'json',
                            success: function (data) {
                                if (angular.isFunction(callback)) {
                                    callback(exceptionData);
                                }
                            },
                            error: function (xhr) {
                                if (angular.isFunction(errorCallback)) {
                                    errorCallback(exceptionData);
                                }
                            }
                        });
                    };

                    global.preventSubmit = function (e) {
                        var key;
                        if (window.event)
                            key = window.event.keyCode; //IE
                        else
                            key = e.which; //firefox      

                        if (key == 13) {
                            e.returnValue = false;
                            e.cancel = true;

                            if (e.preventDefault) {
                                e.preventDefault();
                            }
                        }
                    };
                }
             ]);
    }
);