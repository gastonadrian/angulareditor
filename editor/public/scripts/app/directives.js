define('directives',
    ['angular', 'jquery', 'jqueryui', 'configuration'],
    function (angular, $, jqueryui, configuration) {
        'use strict';

        return angular
            .module('editor.directives', ['editor.services'])
            .directive('mainAppDirective', [
                '$location',
                'messageService',
                'editorEventsChannelService',
                '$window',
                function ($location, messageService, editorEvents, $window) {
                    var directiveDefinitionObject = {
                        priority: 0,
                        restrict: 'A',
                        scope: true,
                        link: function (scope) {

                            scope.location = $location;
                            scope.currentStepIndex = 0;
                            scope.nextUrl = configuration.steps[1].url;
                            scope.backUrl = '/';
                            scope.steps = [];

                            scope.showLoading = false;
                            scope.lastSaved = 'nothing saved yet';

                            //get a copy of the array but without step.controller and step.templateUrl
                            angular.forEach(configuration.steps, function (element, index) {
                                if (element.display) {
                                    this.push({ url: element.url, description: element.description, order: index + 1 });
                                }
                            }, scope.steps);

                            function evaluate(currentUrl) {

                                scope.showNavigation = true;
                                scope.saveEnable = true;
                                scope.saveButtonText = 'SAVE';

                                //route evaluation
                                for (var i = 0; i < scope.steps.length; i++) {

                                    // gets the path of the url
                                    var path = '';
                                    for (var j = 0; j < currentUrl.split('/').length; j++) {
                                        if (currentUrl.split('/')[j]) {
                                            path = currentUrl.split('/')[j];
                                            break;
                                        }
                                    }

                                    if (currentUrl === scope.steps[i].url || scope.steps[i].url.indexOf(path) >= 0) {
                                        scope.currentStepIndex = i;

                                        //set active
                                        $.extend(scope.steps[i], { before: false, prev: false, active: true, next: false });

                                        //hasNext
                                        scope.hasNext = scope.currentStepIndex < (scope.steps.length - 1);
                                        scope.hasBack = scope.currentStepIndex > 0;

                                        //set next element to the active
                                        if (scope.hasNext) {
                                            $.extend(scope.steps[i + 1], { before: false, prev: false, active: false, next: true });
                                            scope.nextUrl = scope.steps[i + 1].url;
                                        }

                                        //set the previous element to the active
                                        if (scope.hasBack) {
                                            $.extend(scope.steps[i - 1], { before: false, prev: true, active: false, next: false });
                                            scope.backUrl = scope.steps[i - 1].url;
                                        }

                                        //set elements before active
                                        var j;
                                        for (j = i - 2; j >= 0; j--) {
                                            $.extend(scope.steps[j], { before: true, prev: false, active: false, next: false });
                                        }

                                        //reset elements after next
                                        for (j = i + 2; j <= scope.steps.length; j++) {
                                            $.extend(scope.steps[j], { before: false, prev: false, active: false, next: false });
                                        }

                                        scope.steps[scope.steps.length - 1].last = true;

                                        break;
                                    } //end-if
                                } //end-for
                            }; //end-function

                            // watch the expression, and update the UI on change.
                            scope.$watch('location.path() + location.url()', function (newValue, oldRoute) {

                                var isStep0 = $location.path().toLowerCase().indexOf('selectdesign') >= 0;
                                var isStep3 = $location.path().toLowerCase().indexOf('editcontent') >= 0;
                                var isStep3WithoutParameters = isStep3 && ($location.path().toLowerCase().indexOf('editcontent/:message') >= 0 || $location.path() === '/editcontent/');
                                var isStep3WithParameters = isStep3 && !isStep3WithoutParameters;

                                // Clear out leave warning if user is not on Step 4.
                                if ($location.path() != configuration.steps[3].url) {
                                    $window.onbeforeunload = null;
                                }

                                if ($location.path() === configuration.steps[4].url && messageService.getScheduleData().stores && messageService.getScheduleData().stores.length) {
                                    scope.showNavigation = false;
                                    return;
                                }

                                // From any step, user can go to step 1, 2, or 3
                                // To go to step 4, message subject must be specified
                                if ($location.path() == configuration.steps[3].url // is step4
                                    && (!messageService.getHeader().subject || !messageService.getHeader().id) // subject is not set or message is not created
                                    && oldRoute.indexOf('editcontent') === -1) { // is not coming from step 3
                                    $location.path(configuration.steps[2].url); // redirect the user to edit content
                                }

                                // isStep3WithParameters, just checking if somebody tries to access using /editcontent/:messageid
                                if (!isStep0 && !messageService.getHeader().name && !isStep3WithParameters) {
                                    //validate walking steps forward
                                    if (configuration.debug) {
                                        messageService.setHeader({
                                            name: 'debug',
                                            layout: 1,
                                            design: 3924
                                        });

                                    } else {
                                        $location.path(scope.steps[0].url);
                                    }
                                }

                                evaluate($location.path());
                            });

                            scope.save = function () {
                                scope.showLoading = true;
                                editorEvents.userSaveContent();
                            };

                            scope.onSavedContent = function () {
                                scope.showLoading = false;
                                scope.lastSaved = 'last saved today at ' + (new Date()).format('hh:mm tt');
                            };

                            var changeSaveButtonText = function (event, data) {
                                scope.saveButtonText = data.buttonCaption;
                            };

                            var changeSaveEnable = function (event, data) {
                                scope.saveEnable = data.isEnabled;
                            };

                            var changeRouteUrl = function (event, data) {
                                scope.steps[data.Index].url = data.Url;
                            };

                            editorEvents.onSuccessfulSave(scope, scope.onSavedContent);
                            editorEvents.onChangeSaveText(scope, changeSaveButtonText);
                            editorEvents.onChangeSaveText(scope, changeSaveButtonText);
                            editorEvents.onChangeSaveEnable(scope, changeSaveEnable);
                            editorEvents.onChangeRouteUrl(scope, changeRouteUrl);

                        } //end-link-function
                    }; //end-directive-object
                    return directiveDefinitionObject;
                } ])
                    .directive('messageName', [
                        'messageService',
                        '$location',
                        '$window',
                        function (messageService, $location, $window) {
                            var directiveObject = {
                                restrict: 'A',
                                scope: {
                                    messageHeader: '=',
                                    callback: '&'
                                },
                                replace: false,
                                templateUrl: '/partials/Directives/messageName.htm',
                                link: function (scope, element) {

                                    var enter = function (e) {
                                        if (e.which == 13) {
                                            scope.modalOkCallback();
                                            scope.$digest();
                                        }
                                        return true;
                                    };

                                    var init = function () {
                                        scope.showInputModal = !messageService.getHeader().name;

                                        if (scope.showInputModal) {
                                            // prevent submit on enter.
                                            $('form').attr('onkeypress', 'javascript:return preventSubmit(event)');
                                        }
                                    };

                                    scope.modalOkCallback = function () {

                                        if (!scope.messageHeader.name) {
                                            return;
                                        }

                                        scope.showInputModal = false;
                                        if (angular.isFunction(scope.callback)) {
                                            scope.callback();
                                        }
                                    };

                                    scope.modalCancelCallback = function () {
                                        $window.location.href = 'http://' + $location.host() + ':' + $location.port() + '/MemberPages/Emails.aspx?sk=' + configuration.sessionKey;
                                    };

                                    scope.bindEnterKey = function () {
                                        // bind enter to input
                                        $('#mailName').bind('keyup', enter);
                                    };

                                    init();
                                }
                            };
                            return directiveObject;
                        }
                    ])
            .directive('designFoldersView', ['messageService', '$compile', function (messageService, compile) {
                var directiveObject = {
                    restrict: 'A',
                    scope: {
                        parentId: '@',
                        onItemClicked: '&',
                        searchText: '=',
                        control: '='
                    },
                    templateUrl: '/partials/Directives/designFoldersView.htm',
                    link: function (scope, element) {
                        scope.control.getFolders = function () {
                            messageService.getDesignFolders({ parentId: scope.parentId ? scope.parentId : '', searchText: scope.searchText }, function (data) {
                                scope.folders = data;
                            });
                        };

                        scope.folderClicked = function (folder, isChild) {
                            if (isChild) {
                                scope.activeSubfolderId = folder.id;
                            }
                            else {
                                if (folder.id == -2) {
                                    scope.searchText = '';
                                    scope.control.getFolders();
                                }

                                scope.activeFolderId = folder.id;
                            }

                            if (!isChild && !folder.children && folder.id != -2) {
                                messageService.getDesignFolders({ parentId: folder.id, searchText: scope.searchText }, function (data) {
                                    folder.children = data;
                                });
                            }

                            if (angular.isFunction(scope.onItemClicked)) {
                                scope.onItemClicked({ selected: folder.id, searchText: scope.searchText });
                            }
                        };

                        scope.control.getFolders();
                    }
                };
                return directiveObject;
            } ])
            .directive('editContentView', [function () {
                var directiveObject = {
                    restrict: 'A',
                    scope: false,
                    link: function (scope, element) {

                        //setup templates
                        scope.dropHereTemplate = element.find('> table tr.dragging');
                        scope.layoutBlockHoverTemplate = element.find('>img.droppableContentBlockDrag');
                        scope.contentBlockHoverMenuBar = element.find('.' + configuration.overlayMenuBarClass);
                        scope.overlayLayer = element.find('.' + configuration.overlayClass);
                    }
                };
                return directiveObject;
            } ])
            .directive(configuration.canvasClass, [
                '$compile',
                '$timeout',
                'editorEventsChannelService',
                '$window',
                '$rootScope',
                function (compile, timeout, editorEvents, $window, rootScope) {
                    var directiveObject = {
                        priority: 0,
                        restrict: 'C',
                        scope: false,
                        link: function (scope, element) {

                            $('#' + configuration.editorHtmlContainerId).on('scroll', onScroll);

                            scope.disableOverlays = false;
                            var didScroll = false;

                            scope.$watch('disableOverlays', function (newValue, oldValue) {
                                if (newValue === oldValue) {
                                    return;
                                }

                                if (newValue) {
                                    element.addClass('hideOverlays');
                                }
                                else {
                                    element.removeClass('hideOverlays');
                                }
                            });

                            function onScroll() {
                                if (!didScroll) {

                                    if (!!$window.requestAnimationFrame) {
                                        $window.requestAnimationFrame(update);
                                    } else {
                                        timeout(function () {
                                            update();
                                        }, 250);
                                    }
                                }
                                didScroll = true;
                            }

                            function update() {

                                if (didScroll) {
                                    didScroll = false;

                                    // contextual editors subscribed to the event can do what they want to
                                    editorEvents.canvasScrolling();
                                }
                            }

                            /*
                            ************ UNDO / REDO METHODS ************
                            */

                            scope.performReorder = function (actionDescriptor, isUndo) {
                                var currentIndex, destinationIndex;
                                if (isUndo) {
                                    destinationIndex = actionDescriptor.PreviousValue;
                                    currentIndex = actionDescriptor.CurrentValue;
                                } else {
                                    destinationIndex = actionDescriptor.CurrentValue;
                                    currentIndex = actionDescriptor.PreviousValue;
                                }

                                alterContentBlockPosition(currentIndex, destinationIndex);
                            };

                            var alterContentBlockPosition = function (currentIndex, destinationIndex) {
                                var movedContent = element.find('.' + configuration.contentBlockClass + ':eq(' + currentIndex.position + ')');
                                var elementInDestinationIndex = element.find('.' + configuration.contentBlockClass + ':eq(' + destinationIndex.position + ')');

                                if (currentIndex.position > destinationIndex.position) {
                                    movedContent.insertBefore(elementInDestinationIndex);
                                } else {
                                    movedContent.insertAfter(elementInDestinationIndex);
                                }
                            };

                            scope.performDeleteOrCreate = function (actionDescriptor, isUndo, isDelete) {

                                // is Create && Undo => Delete 
                                // is Create && Redo => Create 
                                // is Delete && Undo => Created
                                // is Delete && Redo => Delete 

                                var performCreate = (isDelete && isUndo) || (!isDelete && !isUndo);

                                if (performCreate) {

                                    //append the content block
                                    var newContentBlock = scope.compileContentBlock(actionDescriptor.CurrentValue.value, { 'data-content-block-id': actionDescriptor.ContentBlockId });
                                    element.append(newContentBlock);

                                    //get the initial position
                                    var initialIndex = {
                                        position: element.find('.' + configuration.contentBlockClass).index(newContentBlock),
                                        value: newContentBlock
                                    };

                                    //move the contentblock to the position before delete
                                    alterContentBlockPosition(initialIndex, actionDescriptor.CurrentValue);
                                } else {
                                    //remove the element 
                                    element.find('.' + configuration.contentBlockClass + ':eq(' + actionDescriptor.CurrentValue.position + ')')
                                        .remove();
                                }
                            };

                            scope.dragStartPosition = {};

                            // compiles the html of a content block to a content block directive
                            scope.compileContentBlock = function (contentBlock, attrs) {
                                attrs = attrs || {};
                                var contentBlockElement = $(contentBlock).addClass(configuration.contentBlockClass).attr(attrs);

                                return compile(contentBlockElement)(scope);
                            };

                            scope.duplicateContentBlock = function (contentBlock) {
                                var cleanCopy = cleanContentBlockMarkup(contentBlock, false);

                                addContentBlock(cleanCopy, contentBlock);
                            };

                            scope.getUserContent = function () {
                                var contentWrapper = $('<div></div>');

                                var contentBlocks = $('.' + configuration.canvasClass + ' > tbody .editorContentBlock');

                                for (var i = 0; i < contentBlocks.length; i++) {
                                    // Do not remove default content blocks client-side.
                                    var copy = cleanContentBlockMarkup(contentBlocks.eq(i), false);
                                    contentWrapper.append(copy);
                                }

                                return { editableContent: contentWrapper.html() || '<tr></tr>' }; // use tr so that if user emptied the content, we don't automatically generate all the default content blocks

                            };


                            var removeGlobalMarkup = function (contentBlock) {
                                contentBlock.removeClass('ng-isolate-scope ng-scope')
                                    .find('.' + configuration.overlayClass + ', .' + configuration.overlayMenuBarClass).remove();

                                return contentBlock;
                            };

                            var cleanContentBlockMarkup = function (contentBlock, removeUntouchedContent) {

                                var editables = [];

                                // get clean html "ONLY OF THE EDITABLE AREAS"
                                contentBlock.find('[editable]').each(function (index, editableBlock) {
                                    if (removeUntouchedContent && $(editableBlock).hasClass(configuration.contentBlockDefaultValue)) {
                                        // not make all the calculations to get a clean html on this one
                                        editables[index] = $(editableBlock).clone().empty();
                                    } else {
                                        editables[index] = angular.element(editableBlock).scope().getContent();
                                    }
                                });

                                var copy = contentBlock.clone();

                                copy.find('[editable]').each(function (index, newBlock) {
                                    $(newBlock).replaceWith(editables[index]);
                                });

                                return removeGlobalMarkup(copy);
                            };

                            var addContentBlock = function (contentBlockDom, insertAfterElement) {

                                var cb = scope.compileContentBlock(contentBlockDom);

                                if (insertAfterElement) {
                                    cb.insertAfter(insertAfterElement);
                                } else {
                                    element.find(' > tbody').append(cb);
                                }

                                //notify subscribers                                  
                                scope.contentChanged(configuration.contentBlockEvents.Created, scope.$id, cb.data('id'), null,
                                    {
                                        position: element.find('.' + configuration.contentBlockClass).index(cb),
                                        value: $.fn.outerHTML(cb)
                                    });
                            };

                            //set modal
                            if (!$('.' + configuration.imageEditorModal).length) {
                                var imgModal = compile($('<div data-image-editor-modal="true"></div>'))(scope);
                                $('body').append(imgModal)
                                    .append('<div class="modal-backdrop image-editor-modal" style="display:none;"></div>');
                            }

                            var lastDroppable;

                            // configure editor to have sortable content blocks
                            element.find('> tbody').sortable({
                                axis: 'y',
                                cursor: 'move',
                                items: ' > tr.' + configuration.contentBlockClass,
                                handle: '.drag',
                                containment: '#editorCanvas',
                                revert: false,
                                refreshPositions: true,
                                start: function (e, ui) {
                                    // disable overlays
                                    scope.disableOverlays = true;
                                    element.addClass('hideOverlays');

                                    // remove place holder
                                    ui.placeholder.hide();

                                    // add drop here only if there is no one present
                                    var tbody = $('.ui-sortable');
                                    if (!tbody.find('tr.dragging').length) {

                                        //drop here tooltips after/before each row
                                        if ($('.' + configuration.canvasClass + '> tbody > tr.' + configuration.contentBlockClass).length) {
                                            scope.dropHereTemplate.clone().insertAfter(ui.item.siblings(':not(.ui-sortable-placeholder)'));
                                            scope.dropHereTemplate.clone().insertBefore(ui.item.siblings(':not(.ui-sortable-placeholder):eq(0)'));
                                        }
                                        else {
                                            tbody.prepend(scope.dropHereTemplate.clone());
                                        }

                                        tbody.find('tr.dragging').droppable({
                                            tolerance: 'touch',
                                            hoverClass: 'active',
                                            over: function (evt, ui) {
                                                lastDroppable = evt.target;
                                            }
                                        });
                                    }

                                    if (!ui.item.hasClass(configuration.droppableContentBlockClass)) {
                                        // if sortable starts with a content block
                                        scope.dragStartPosition = {
                                            position: element.find('.' + configuration.contentBlockClass).index(ui.item),
                                            value: $.fn.outerHTML(ui.item)
                                        };
                                    }

                                },
                                stop: function (e, ui) {
                                    rootScope.safeApply(function () {
                                        scope.disableOverlays = false;
                                    });
                                    $('.ui-sortable > tr.dragging').remove();
                                },
                                update: function (e, ui) {
                                    // this event is triggered in two occasions,
                                    // 1) when we sort the content blocks inside the editor (prevent to pub the changed event -this is done on the drop stop event-)
                                    // 2) when we drop a layout content block
                                    if (ui.item.hasClass(configuration.droppableContentBlockClass)) {
                                        //drag of a new content block

                                        if (scope.droppedContent.indexOf('data-no-duplicate=') > 0) {
                                            var noDuplicateType = $(scope.droppedContent).attr("data-no-duplicate");

                                            if ($('.' + configuration.canvasClass + ' tr[data-no-duplicate="' + noDuplicateType + '"]').length > 0) {
                                                ui.item.remove();
                                                scope.validationErrors = "Only one REDEEM content block is allowed per email.";
                                                scope.showValidationMessage = true;
                                                scope.finishRejectedDrop();
                                                return;
                                            }
                                        }

                                        //create the content block
                                        var cb = scope.compileContentBlock(scope.droppedContent);
                                        ui.item.remove();
                                        $(lastDroppable).replaceWith(cb);

                                        //notify subscribers                                  
                                        scope.contentChanged(configuration.contentBlockEvents.Created, scope.$id, cb.data('id'), null,
                                            {
                                                position: element.find('.' + configuration.contentBlockClass).index(cb),
                                                value: $.fn.outerHTML(cb)
                                            });
                                    } else {
                                        // sort
                                        $(lastDroppable).replaceWith(ui.item);

                                        scope.contentChanged(configuration.contentBlockEvents.Reordered, scope.$id, ui.item.data('id'), scope.dragStartPosition,
                                            {
                                                position: element.find('.' + configuration.contentBlockClass).index(ui.item),
                                                value: $.fn.outerHTML(ui.item)
                                            });
                                    }
                                }
                            });

                            timeout(function () {
                                //on editor ready https://github.com/angular/angular.js/issues/734
                                // disable links
                                $('#' + configuration.editorHtmlContainerId)
                                    .find('.outerWrapper table a:not([data-editor-href])')
                                    .each(function () {
                                        var href = $(this).attr("href");
                                        if (href) {
                                            $(this).attr("data-editor-href", href);
                                        }
                                    })
                                    .end()
                                    .find('.outerWrapper table a:not([data-cke-saved-href])') // ignore links inserted by Hyperlink Manager, already disabled
                                    .attr("href", "javascript:;")
                                    .end() // start adding max-height restriction
                                    .css('max-height', $(window).height());
                            }, 0);

                            var cleanup = function () {
                                $('.modal-backdrop.image-editor-modal').remove();
                                $('div[data-image-editor-modal]').remove();
                            };

                            scope.$on('$destroy', function () {
                                cleanup();
                            });

                        }
                    };
                    return directiveObject;
                } ])
            .directive(configuration.droppableContentBlockClass, [
                '$rootScope',
                function (rootScope) {
                    var directiveObject = {
                        priority: 0,
                        restrict: 'C',
                        scope: false,
                        template: '<td><img data-ng-src="{{block.thumbnailUrl}}" alt="{{block.name}}" class="img-polaroid"/><td>',
                        link: function (scope, element) {

                            element.draggable({
                                helper: 'clone',
                                connectToSortable: '.' + configuration.canvasClass + '>tbody',
                                revert: 'invalid',
                                start: function (evt, ui) {
                                    //drag and drop helper (the contentblock img with the icon on topright)
                                    $(ui.helper).css('z-index', 9999);
                                    if (ui.originalPosition.top > ui.offset.top) {
                                        $(ui.helper).css('margin-top', (evt.clientY - ui.offset.top) + 'px');
                                    }
                                    //hover image on layout content block
                                    scope.layoutBlockHoverTemplate.clone().appendTo(ui.helper);

                                    //html content to be dropped
                                    scope.$parent.droppedContent = scope.block.html;
                                },
                                stop: function () {
                                    rootScope.safeApply(function () {
                                        scope.$parent.disableOverlays = false;
                                    });
                                    $('.ui-sortable > tr.dragging').remove();
                                }
                            }).disableSelection();

                        }
                    };
                    return directiveObject;
                } ])
            .directive(configuration.contentBlockClass, [
                '$compile',
                'editorEventsChannelService',
                '$rootScope',
                function (compile, eventsService, rootScope) {
                    var directiveDefinitionObject = {
                        priority: 0,
                        restrict: 'C',
                        scope: {},
                        link: function (scope, element, iAttrs) {

                            var menubar = scope.$parent.contentBlockHoverMenuBar.clone();

                            // Remove duplicate button 
                            if (element.data('noDuplicate')) {
                                $(menubar).find(".icon-duplicate").parent().hide();
                            }

                            var onContextualEditorFocus = function (event) {
                                if (event.contentBlockId == element.data('id')) {
                                    rootScope.safeApply(function () {
                                        scope.$parent.disableOverlays = true;
                                    });
                                }
                            };

                            var onContextualEditorBlur = function (event) {
                                if (event.contentBlockId == element.data('id')) {
                                    rootScope.safeApply(function () {
                                        scope.$parent.disableOverlays = false;
                                    });
                                }
                            };

                            //Generates a new content block id
                            var generateContentBlockId = function () {
                                //the seed for ids its on body element
                                var id = ($('body').data('lastCBId') || 0) + 1;
                                //update seed
                                $('body').data('lastCBId', id);

                                return id;
                            };

                            var setContentBlockId = function () {
                                // when a content block is recreated because an undo/redo, the id is passed to the constructor in order to generate the cb with the same id
                                // if there is not id on iAttrs, then generate a new.
                                var id = parseInt(iAttrs.contentBlockId || generateContentBlockId());

                                //save a copy of the id in dom.
                                element.data('id', id);
                                return id;
                            };

                            scope.id = setContentBlockId();

                            element.mouseover(function (evt) {

                                // prevent bubbling
                                evt.stopImmediatePropagation();

                                // prevent evaluate mouseover on overlay widget
                                // prevent create overlays on editmode
                                if (scope.$parent.disableOverlays
                                    || $(evt.target).is('.' + configuration.overlayClass)
                                    || $(evt.target).is('.' + configuration.overlayMenuBarClass)
                                    || $(evt.target).parents('.' + configuration.overlayMenuBarClass).length) {
                                    return false;
                                }

                                // setup overlay if necessary
                                element.find('[editable]').each(function (i, contentElement) {

                                    contentElement = $(contentElement);
                                    var ovr = contentElement.find('.' + configuration.overlayClass);

                                    if (!ovr.length) {
                                        ovr = scope.$parent.overlayLayer.clone();
                                        ovr.appendTo(contentElement);
                                    }

                                    ovr.height(contentElement.height())
                                        .width(contentElement.width());

                                    if (!ovr.is(':visible')) {
                                        // hi old friend IE!!! 
                                        window.setTimeout(function () {
                                            ovr.position({ my: 'center center', at: 'center center', of: contentElement, collision: 'none', within: contentElement });
                                        });
                                    }
                                    else {
                                        ovr.position({ my: 'center center', at: 'center center', of: contentElement, collision: 'none', within: contentElement });
                                    }

                                });

                                if (!menubar.is(':visible')) {
                                    // wait for render thread, thanks IE8
                                    window.setTimeout(function () {
                                        menubar.position({ my: 'center bottom', at: 'center top', of: element });
                                    }, 0);
                                }
                                else {
                                    menubar.position({ my: 'center bottom', at: 'center top', of: element });
                                }

                                return true;
                            });

                            scope.destroy = function () {

                                var currentValue = {
                                    value: $.fn.outerHTML(element),
                                    position: $('.' + configuration.canvasClass + ' > tbody .' + configuration.contentBlockClass).index(element)
                                };

                                element.remove();
                                scope.$parent.contentChanged(configuration.contentBlockEvents.Deleted, scope.$parent.$id, scope.id, null, currentValue);
                            };

                            scope.duplicate = function () {
                                scope.$parent.duplicateContentBlock(element);
                            };

                            menubar = compile(menubar)(scope);
                            menubar.appendTo(element.find('[editable]:eq(0)'));

                            //subscribe to contextual editor events
                            eventsService.onContextualEditorFocus(scope, onContextualEditorFocus);
                            eventsService.onContextualEditorBlur(scope, onContextualEditorBlur);
                        }
                    };
                    return directiveDefinitionObject;
                } ])
            .directive('messagePreview', [
                'messageService',
                'editorEventsChannelService',
                function (messageService, editorEvents) {
                    var directiveDefinitionObject = {
                        priority: 0,
                        restrict: 'A',
                        templateUrl: '/partials/Directives/messagePreview.htm',
                        scope: {
                            selectedStore: '=',
                            storeSelectorOnTop: '@',
                            storeSelectorLabel: '@',
                            isDraft: '@',
                            waitForEnterprise: '@'
                        },
                        link: function (scope, element) {

                            var selectedMailFormat,
                                msgHeader;

                            var composeUrl = function () {
                                return '/api/previews/' + msgHeader.id + '?sk=' + configuration.sessionKey + '&storeId=' + scope.selectedStore.Id + '&mailFormat=' + selectedMailFormat.format;
                            };

                            scope.mailFormatChanged = function (mailFormat, forceRefresh) {

                                if (!scope.initialized) {
                                    return;
                                }

                                // set header
                                msgHeader = messageService.getHeader();
                                scope.from = msgHeader.from;
                                scope.subject = msgHeader.subject;

                                // holds the reference.
                                selectedMailFormat = mailFormat || selectedMailFormat;

                                var url = composeUrl();

                                if (url != selectedMailFormat.lastUrl || forceRefresh) {

                                    // used to prevent reloading the iframes
                                    selectedMailFormat.lastUrl = url;
                                    // to avoid cache and force iframe reload
                                    selectedMailFormat.url = url + '&_t=' + new Date().getTime();

                                    if (selectedMailFormat.format == scope.textTab.format) {

                                        // refresh content
                                        scope.textTab.content = messageService.getPreview({
                                            storeId: scope.selectedStore.Id,
                                            mailFormat: scope.textTab.format
                                        }, function (data) {
                                            scope.textTab.content = data.text;
                                        });
                                    }
                                }
                            };

                            var init = function () {

                                if (scope.initialized) {
                                    // the user is opening the send a test modal again
                                    scope.mailFormatChanged(selectedMailFormat, true);
                                    return;
                                }

                                scope.initialized = true;

                                scope.storeSelectorLabel = scope.storeSelectorLabel || 'Use the following store location information:';
                                scope.selectedStore = scope.selectedStore || { Name: 'Preview with my member profile', Id: 0 };
                                scope.htmlTab = { format: 2, url: null, lastUrl: null };
                                scope.textTab = { format: 1, url: null, content: null, lastUrl: null };
                                scope.onlineTab = { format: 4, url: null, lastUrl: null };
                                selectedMailFormat = scope.htmlTab;

                                // get list of stores
                                scope.stores = messageService.getStores({ listId: 0 }, function (data) {
                                    data.splice(0, 0, scope.selectedStore);
                                    //refresh the preview when user changes the selected store
                                    scope.$watch('selectedStore.Id', function () {
                                        scope.mailFormatChanged(selectedMailFormat, false);
                                    });
                                });

                                if (scope.storeSelectorOnTop === 'true') {
                                    element.find('.storeSelector').insertBefore(element.find('[tabset]'));
                                }
                            };

                            if (scope.waitForEnterprise === 'true') {
                                editorEvents.onEnterpriseSaveSuccess(scope, init);
                            }
                            else {
                                init();
                            }
                        }
                    };
                    return directiveDefinitionObject;
                } ])
           .directive('sendATestModal', ['messageService', '$timeout', '$anchorScroll', '$location', function (messageService, timeout, $anchorScroll, $location) {
               var directiveDefinitionObject = {
                   priority: 0,
                   restrict: 'A',
                   templateUrl: '/partials/Directives/sendATest.htm',
                   scope: {
                       showSendATestModal: '='
                   },
                   link: function (scope, element, attrs) {
                       scope.data = {
                           emailAddress: '',
                           selectedStore: 0,
                           sendATestValidationErrors: ''
                       };

                       scope.sendATest = function () {
                           scope.submitted = true;
                           scope.data.sendATestValidationErrors = '';

                           scope.gotoBottom = function () {
                               // set the location.hash to the id of
                               // the element you wish to scroll to.
                               $location.hash('sendATestValidationMessage');

                               // call $anchorScroll()
                               $anchorScroll();
                           };

                           if (scope.data.emailAddress) {
                               messageService.sendaTest({ emailAddresses: scope.data.emailAddress, storeId: scope.data.selectedStore.Id },
                                   function () {
                                       scope.showSendATestModal = false;
                                   },
                                   function (errorData) {
                                       scope.data.sendATestValidationErrors = errorData.text;
                                       scope.gotoBottom();
                                   }
                                );
                           }
                           else {
                               scope.gotoBottom();
                           }
                       };
                   }
               };
               return directiveDefinitionObject;
           } ])
            .directive('previewIframe', [function () {
                var directiveDefinitionObject = {
                    restrict: 'A',
                    scope: {
                        src: '@',
                        height: '@',
                        width: '@'
                    },
                    replace: true,
                    template: '<iframe class="frame" width="{{width}}" frameborder="0" border="0" marginwidth="0" marginheight="0" data-ng-src="{{src}}"></iframe>',
                    link: function (scope, element) {

                        element.load(function (event) {
                            // deactivate links
                            $(event.target.contentDocument).find('.outerWrapper table a').attr('href', 'javascript:;');
                        });
                    }
                };
                return directiveDefinitionObject;
            } ])
            .directive('jqueryDatepicker', function () {
                return {
                    restrict: 'A',
                    require: 'ngModel',
                    scope: {
                        showCallback: '&'
                    },
                    link: function (scope, element, attrs, ngModelCtrl) {
                        $(function () {

                            element.datepicker({
                                showOn: "both",
                                buttonImageOnly: true,
                                buttonImage: "/img/calendar.gif",
                                defaultDate: new Date(),
                                minDate: new Date(),
                                onSelect: function (date) {
                                    ngModelCtrl.$setViewValue(date);
                                    scope.$apply();
                                }
                            }).datepicker('setDate', new Date());

                            element.next().on('click', function () {
                                if (angular.isFunction(scope.showCallback)) {
                                    scope.showCallback();
                                }
                            });

                        });
                    }
                };
            })
            .directive('imageEditorModal', [
                '$timeout',
                '$compile',
                'messageService',
                '$rootScope',
                function (timeout, compile, messageService, $rootScope) {
                    var directiveDefinitionObject = {
                        restrict: 'A',
                        scope: {},
                        templateUrl: '/partials/Directives/imageEditor.htm',
                        replace: true,
                        link: function (scope, element) {

                            var postPdfUrl = '/api/images/PostToImagePreview?sk=' + configuration.sessionKey,
                                postImageUrl = '/api/images/PostMessageImage?sk=' + configuration.sessionKey,
                                imgMapperDom = $('<div class="row-fluid" imgmap data-img-width="{{imageData.width}}" data-img-height="{{imageData.height}}" data-img-source="{{previewSrc}}" data-map-output="mapperOutput" data-show-image-mapper="mapperMode" data-ng-show="mapperMode"></div>'),
                                fileExtensionsRegex = /^(?:gif|pdf|png|jpeg|jpg)$/i,
                                emailRegex = /^(mailto:)?((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
                                urlRegex = /^((https?|s?ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|\/|\?)*)?$/i,
                                defaultImageData = {
                                    id: 0,
                                    src: null,
                                    alt: null,
                                    linkto: null,
                                    height: 0,
                                    width: 0,
                                    maxWidth: 1,
                                    fileHeight: 0,
                                    fileWidth: 0,
                                    map: false
                                };

                            // /^((emailRegex)|(urlRegex))$/i
                            scope.linktoRegex = /^(((mailto:)?((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))|(((https?|s?ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|\/|\?)*)?))$/i;
                            scope.progress = 0;
                            scope.imageScale = 0;
                            scope.maxImageScale = 0;
                            scope.action = postImageUrl;
                            scope.imageData = angular.copy(defaultImageData);

                            scope.onLoadFile = function (fileInfo, fileName) {

                                var fileExtension = fileName.split('.')[fileName.split('.').length - 1].toLowerCase();

                                if (fileExtension == 'pdf') {
                                    // upload pdf to get image preview
                                    scope.action = postPdfUrl;
                                    scope.validFile = true;

                                    element.find('input[type=submit]').click();

                                } else {

                                    scope.validFile = validateSelectedImg(fileInfo, fileExtension);
                                    scope.action = postImageUrl;

                                    if (scope.validFile) {

                                        scope.selectedFile = fileInfo || fileName;
                                        scope.imageData.src = fileName;

                                        // generate img preview
                                        scope.generatePreview();
                                    }

                                    scope.$apply();
                                }
                            };

                            scope.sendFile = function (content, completed) {
                                if (completed) {
                                    // remove the action attribute from the form
                                    element.find('form').removeAttr('action');
                                    scope.progress = 0;

                                    // the data received is an image
                                    scope.imageData.src = content.Url;
                                    scope.imageData.id = content.Id;

                                    if (scope.action == postPdfUrl) {

                                        // updates the preview
                                        scope.previewSrc = content.Url;
                                        scope.imageData.fileHeight = content.Height;
                                        scope.imageData.fileWidth = content.Width;

                                        scope.action = postImageUrl;
                                        element.find('form').attr('action', scope.action + '&_t=' + new Date().getTime());

                                    } else if (scope.action == postImageUrl) {
                                        // the data received is the image saved
                                        // everything went well
                                        // do processing
                                        scope.imageData.map = scope.mapperMode ? scope.mapperOutput : false;

                                        $rootScope.$broadcast('IMAGE_EDITOR_CHANGED',
                                            {
                                                data: scope.imageData
                                            });

                                        // close the modal
                                        scope.close();
                                    }
                                } else {
                                    scope.progress = 50;
                                }
                            };

                            scope.show = function () {
                                scope.showImageEditor = true;
                                scope.mapperMode = !!scope.imageData.map;
                            };

                            scope.close = function () {
                                scope.showImageEditor = false;
                            };

                            var validateSelectedImg = function (fileInfo, fileExtension) {

                                // nothing selected
                                if (fileInfo && !fileInfo.length) {
                                    return false;
                                }

                                // validate file.extension
                                if (!fileExtensionsRegex.test(fileExtension)) {
                                    alert("You must select a valid image file!");
                                    return false;
                                }

                                return true;
                            };

                            scope.progressBar = function () {
                                return {
                                    width: scope.progress + '%'
                                };
                            };

                            scope.$watch('showImageEditor', function (newValue, oldValue) {
                                if (oldValue != newValue) {
                                    if (newValue) {

                                        timeout(function () {
                                            scope.imageOverlay();
                                            $('.modal-backdrop').show();
                                            $('body').addClass('modal-open');


                                        }, 0);
                                    } else {
                                        $('.modal-backdrop').hide();
                                        scope.imageData = angular.copy(defaultImageData);
                                        scope.editorId = 0;
                                        $('body').removeClass('modal-open');
                                        scope.mapperMode = false;
                                    }
                                }
                            });

                            scope.$watch('mapperMode', function (newValue) {

                                if (newValue) {

                                    // ensure to have the directive injected also in edit map mode
                                    timeout(function () {
                                        var imgMapper = imgMapperDom.clone().appendTo(element.find('.modal-body'));
                                        compile(imgMapper)(scope);
                                    });

                                } else if (angular.element('.modal-body > [imgmap]') && angular.element('.modal-body > [imgmap]').scope()) {
                                    angular.element('.modal-body > [imgmap]').remove();
                                }

                            });

                            scope.changeDimension = function (event) {
                                var lastImgScale = scope.imageScale;

                                if (event.target.name == 'width') {
                                    scope.imageScale = scope.imageData.width > scope.imageData.maxWidth ? scope.maxImageScale : scope.imageData.width / scope.imageData.fileWidth;

                                } else {
                                    scope.imageScale = (scope.imageData.height / scope.imageData.fileHeight) > scope.maxImageScale ? scope.maxImageScale : (scope.imageData.height / scope.imageData.fileHeight);
                                }

                                if (lastImgScale == scope.imageScale) {
                                    // even if the image scale doesnt change, update width and height
                                    scope.onImageScaleChange(lastImgScale, 0);
                                }
                            };

                            scope.$watch('imageData.fileWidth', function (fileWidth) {
                                // recalculate image factor
                                // if filewidth > maxWidth => factor needs to be appropiate so imageData.width is equal to maxWidth
                                // if filewidth < maxwidth then factor is equal to 1, so imageData.Width == fileWidth
                                scope.maxImageScale = Number(scope.imageData.maxWidth) < Number(fileWidth) ? Number(scope.imageData.maxWidth) / Number(fileWidth) : 1;
                                scope.imageScale = Number(scope.imageData.width) / Number(scope.imageData.fileWidth);
                            });

                            scope.onImageScaleChange = function (imageScale, oldValue) {
                                if (imageScale != oldValue) {
                                    // image factor could change because a change on file width
                                    // or because a change on UI (slider, HxW textboxes)
                                    scope.imageData.width = parseInt(Number(imageScale * scope.imageData.fileWidth));
                                    scope.imageData.height = parseInt(Number(imageScale * scope.imageData.fileHeight));
                                }
                            };

                            scope.$watch('imageScale', scope.onImageScaleChange);

                            scope.beforeSend = function () {

                                element.find('form').attr('action', scope.action + '&_t=' + new Date().getTime());
                                element.find('input[name=src]').val(scope.imageData.src);
                                element.find('input[name=id]').val(scope.imageData.id);
                                element.find('input[name=messageId]').val(messageService.getHeader().id);

                                if (scope.imageData.linkto && scope.imageData.linkto.length) {
                                    if (emailRegex.test(scope.imageData.linkto) && scope.imageData.linkto.indexOf('mailto:') == -1) {
                                        // add mailto:
                                        scope.imageData.linkto = 'mailto:' + $.trim(scope.imageData.linkto);

                                    } else if (urlRegex.test(scope.imageData.linkto) && scope.imageData.linkto.indexOf('http') == -1) {
                                        // add http://
                                        scope.imageData.linkto = 'http://' + $.trim(scope.imageData.linkto);
                                    }
                                }

                                // This is special case to address scenario as described in TP #16486 
                                // User can hit Enter while in the width/height textbox, and it will submit the form without validating
                                // We will automatically update the dimension to make sure it still falls in the allowed range
                                var lastImgScale = scope.imageScale;
                                var imageScaleByWidth = (Number(scope.imageData.width) / Number(scope.imageData.fileWidth)).toFixed(2);
                                var imageScaleByHeight = (Number(scope.imageData.height) / Number(scope.imageData.fileHeight)).toFixed(2);
                                var minScale = 0.1; // same as slider's min range

                                if (imageScaleByHeight < minScale || imageScaleByWidth < minScale) {
                                    scope.imageScale = minScale;
                                }
                                else if (imageScaleByHeight > scope.maxImageScale || imageScaleByWidth > scope.maxImageScale) {
                                    scope.imageScale = scope.maxImageScale;
                                }
                                else if (imageScaleByWidth != lastImgScale) {
                                    scope.imageScale = imageScaleByWidth;
                                }
                                else if (imageScaleByHeight != lastImgScale) {
                                    scope.imageScale = imageScaleByHeight;
                                }

                                // Enforce change
                                scope.onImageScaleChange(scope.imageScale, 0);
                            };

                            scope.displayImageMapper = function () {
                                scope.mapperMode = true;
                            };

                            scope.imageOverlay = function () {
                                // Set initial overlay height, width and position
                                var overlay = element.find('.ui-widget-overlay');
                                overlay.height(scope.imageData.height > 250 ? 250 : scope.imageData.height).width(scope.imageData.width);
                                overlay.position({ my: 'left top', at: 'left top', of: element.find('#imagePreview img') });

                                // Set initial overlay buttons position
                                var imageButtons = element.find('#imageButtons');
                                imageButtons.position({ my: 'center center', at: 'center center', of: element.find('#imagePreview') });
                                imageButtons.hide();

                                // Binding of image hover
                                element.find('#imagePreview').hover(function () {
                                    var img = element.find('#imagePreview img');
                                    overlay.show(); // Show first before applying the position to prevent issues with jquery ui position()
                                    overlay.height(img.height() > 250 ? 250 : img.height()).width(img.width());
                                    overlay.position({ my: 'left top', at: 'left top', of: element.find('#imagePreview img') });

                                    imageButtons.show(); // Show first before applying the position to prevent issues with jquery ui position()
                                    imageButtons.position({ my: 'center center', at: 'center center', of: element.find('#imagePreview') });
                                }, function () {
                                    overlay.hide();
                                    imageButtons.hide();
                                });
                            };

                            scope.isValidForm = function () {
                                return ((!scope.mapperMode && scope.validFile && element.find('input[name=linkto]').hasClass('ng-valid'))
                                    || scope.mapperMode && element.find('input[name=shapehref]').hasClass('ng-valid'));
                            };

                            //browser specific behaivor to display the image preview without loading
                            scope.generatePreview = (function (contextScope) {
                                if (window.FileReader) {

                                    var fileReader = new window.FileReader();

                                    fileReader.onload = function (event) {

                                        // use a temp img to render the image and get the dimensions
                                        contextScope.$apply(function () {
                                            element.append('<img class="hiddenPreview" style="visibility:hidden;" src="' + event.target.result + '" />');
                                        });

                                        // wait until rendering is done
                                        timeout(function () {
                                            //get dimensions
                                            var w = element.find('.hiddenPreview').width();
                                            var h = element.find('.hiddenPreview').height();
                                            contextScope.imageData.fileWidth = w;
                                            contextScope.imageData.fileHeight = h;
                                            contextScope.imageData.width = w > contextScope.imageData.maxWidth ? contextScope.imageData.maxWidth : w;

                                            //remove temp
                                            element.find('.hiddenPreview').remove();
                                            contextScope.previewSrc = event.target.result;

                                            // reflect the changes in the view
                                            contextScope.$apply();
                                        }, 0);
                                    };

                                    return function () {
                                        fileReader.readAsDataURL(contextScope.selectedFile[0]);
                                    };
                                } else {
                                    return function () {

                                        contextScope.action = postPdfUrl;
                                        contextScope.validFile = true;
                                        element.find('input[type=submit]').click();
                                    };
                                }
                            })(scope);

                            $rootScope.$broadcast('IMAGE_MODAL_READY', scope);
                        }
                    };
                    return directiveDefinitionObject;
                }
            ])
            .directive('file', [
                function () {
                    var directiveDefinitionObject = {
                        restrict: 'A',
                        scope: {
                            file: '=',
                            form: '='
                        },
                        link: function (scope, element) {
                            element.bind('change', function (event) {
                                scope.file(event.target.files, event.target.value, $(event.target).parents('form'));
                            });
                        }
                    };
                    return directiveDefinitionObject;
                }
            ])
            .directive('slider', [
                function () {
                    var directiveDefinitionObject = {
                        restrict: 'C',
                        scope: {
                            rangeValue: '=',
                            onSlide: '=',
                            maxRangeValue: '='
                        },
                        link: function (scope, element) {

                            element.slider({
                                min: 10,
                                max: scope.maxRangeValue * 100,
                                value: scope.rangeValue * 100,
                                change: function (event, ui) {
                                    scope.onSlide(ui.value / 100);

                                    // prevent to enter on a double digest cycle 
                                    if (!scope.$root.$$phase) {
                                        scope.$apply();
                                    }
                                }
                            });

                            scope.$watch('maxRangeValue', function (newValue, oldValue) {
                                if (newValue !== oldValue) {
                                    element.slider({ max: newValue * 100, value: scope.rangeValue * 100 });
                                }
                            });

                            scope.$watch('rangeValue', function (newValue, oldValue) {
                                if (newValue !== oldValue) {
                                    element.slider({ max: scope.maxRangeValue * 100, value: newValue * 100 });
                                }
                            });
                        }
                    };
                    return directiveDefinitionObject;
                }
            ])
            .directive('blurInput', [
                '$parse',
                function ($parse) {
                    var directiveDefinitionObject = {
                        restrict: 'AC',
                        require: 'ngModel',
                        link: function (scope, element, attrs) {

                            var onBlur = $parse(attrs.onBlur);

                            if (!angular.isFunction(onBlur)) {
                                throw "The expression on the onblur input directive does not point to a valid function.";
                            }

                            element.blur(function (evt) {
                                scope.$apply(function () {
                                    onBlur(scope, { event: evt });
                                });
                            });
                        }
                    };
                    return directiveDefinitionObject;
                }
            ])
            .directive('imgmap', [
                '$timeout',
                '$compile',
                function (timeout, compile) {
                    var dir = {
                        restrict: 'AC',
                        templateUrl: '/partials/Directives/imageMapper.htm',
                        scope: {
                            imgWidth: '@',
                            imgHeight: '@',
                            imgSource: '@',
                            showImageMapper: '=',
                            mapOutput: '='
                        },
                        link: function (scope) {

                            var lastShapeId = 0, // last shape added by the plugin on inactive state (undrawn)					
                                mapper, // mapper instance
                                emailRegex = /^(mailto:)?((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
                                urlRegex = /^((https?|s?ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|\/|\?)*)?$/i,
                                loadingAreas = false;

                            scope.shapes = [];
                            scope.hoverArea = -1;

                            // /^((emailRegex)|(urlRegex))$/i
                            scope.linktoRegex = /^(((mailto:)?((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))|(((https?|s?ftp):\/\/)?(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)|\/|\?)*)?))$/i;

                            /* Called by the plugin when adds a new shape 
                            (usually is when the user finish the drawing on an active shape, 
                            then the plugin adds another unactive shape, that will be drawn in the future) 
                            Can also be called by the plugin when loads an existing map to be edited
                            */
                            var onAddArea = function (id) {

                                // on map loading.
                                if (scope.shapes[id]) {
                                    return;
                                }

                                lastShapeId = id;
                            };

                            /*
                            Called by the plugin after the user stops -resizing-moving-drawing- a shape
                            */
                            var onRelaxArea = function (id) {

                                if (loadingAreas) {
                                    return;
                                }

                                if (!scope.shapes[id]) {

                                    //the user has ended the draw of the inactive shape
                                    mapper.viewmode = 1;

                                    onSelectArea(mapper.areas[id]);

                                } else {

                                    //pass the pointer to an inactive shape
                                    mapper.currentid = lastShapeId;

                                    // update output only on move-resize 
                                    // onCreate is updated when the user press save.
                                    scope.mapOutput = mapper.getMapHTML();
                                }
                            };

                            scope.saveShape = function (currentShape) {

                                if (emailRegex.test(currentShape.href) && currentShape.href.indexOf('mailto:') == -1) {
                                    // add mailto:
                                    currentShape.href = 'mailto:' + $.trim(currentShape.href);

                                } else if (urlRegex.test(currentShape.href) && currentShape.href.indexOf('http') == -1) {
                                    // add http://
                                    currentShape.href = 'http://' + $.trim(currentShape.href);
                                }

                                if (!scope.shapes[currentShape.id]) {

                                    // add it to the collection
                                    scope.shapes[currentShape.id] = {
                                        id: currentShape.id,
                                        alt: currentShape.alt,
                                        href: currentShape.href,
                                        hover: 'Link to: ' + currentShape.href
                                    };

                                    // allow edit mode
                                    mapper.viewmode = 0;

                                    // tooltip on hover setup
                                    $(mapper.areas[currentShape.id]).attr('tooltip', '{{shapes[hoverArea].hover}}');
                                    compile(mapper.areas[currentShape.id])(scope);

                                    // generate a new unactive area and make the cursor operations point there.
                                    mapper.addNewArea();
                                } else {

                                    // update shape
                                    scope.shapes[currentShape.id].alt = currentShape.alt;
                                    scope.shapes[currentShape.id].href = currentShape.href;
                                    scope.shapes[currentShape.id].hover = 'Link to: ' + currentShape.href;

                                    // points mapper operations to the last unactive shape
                                    mapper.currentid = lastShapeId;
                                }

                                // common operations to save and update

                                // update html map data
                                mapper.areas[currentShape.id].ahref = currentShape.href;
                                mapper.areas[currentShape.id].aalt = currentShape.alt;

                                // update html output
                                scope.mapOutput = mapper.getMapHTML();
                            };

                            scope.cancelShape = function (currentShape) {

                                if (!scope.shapes[currentShape.id]) {

                                    // cancel new shape
                                    scope.removeShape(currentShape.id);
                                }

                            };

                            // A shape could be removed from UI on click in "Remove"
                            // Can Also be removed using the delete key.
                            scope.removeShape = function (id) {

                                // cancel new shape
                                if (!scope.shapes[id] && mapper.areas[id]) {

                                    // allow drawing map mode
                                    mapper.viewmode = 0;

                                    // remove shape from canvas
                                    mapper.removeArea(id, false);

                                    // create a new unactive shape
                                    mapper.addNewArea();
                                } else { //Remove an existing shape

                                    if (mapper.areas[id]) {
                                        // remove shape from canvas
                                        mapper.removeArea(id, false);
                                    }

                                    // remove it from our collection
                                    scope.shapes[id] = null;
                                }

                                scope.currentShape = null;

                                // update output
                                scope.mapOutput = mapper.getMapHTML();

                            };

                            var onSelectArea = function (obj) {

                                // display the edition form
                                scope.$apply(function () {
                                    scope.currentShape = {
                                        id: obj.aid,
                                        alt: obj.aalt,
                                        href: obj.ahref
                                    };

                                    highlightArea(obj.aid);

                                });
                            };

                            var onShapeChanged = function (newValue, oldValue) {
                                if (newValue != oldValue) {

                                    if (mapper.areas[mapper.currentid] && mapper.areas[mapper.currentid].shape != newValue && mapper.areas[mapper.currentid].shape != 'undefined') {

                                        //shape changed, adjust coords intelligently inside _normCoords
                                        var coords = mapper.areas[mapper.currentid].lastInput || '';
                                        coords = mapper._normCoords(coords, newValue, 'from' + mapper.areas[mapper.currentid].shape);
                                        mapper.areas[mapper.currentid].shape = newValue;

                                        if (mapper.is_drawing != 0) {
                                            mapper.is_drawing = newValue == "rect" ? mapper.DM_RECTANGLE_DRAW : mapper.DM_SQUARE_DRAW; // circle uses DM_SQUARE_DRAW
                                        }

                                        mapper._recalculate(mapper.currentid, coords);
                                    }
                                    mapper.nextShape = newValue;
                                }
                            };

                            var onFocusArea = function (area) {
                                // not proud of this.
                                scope.hoverArea = area.id.split('area')[1];
                            };

                            scope.removeMap = function () {
                                scope.showImageMapper = false;
                                scope.mapOutput = '';
                            };

                            var loadArea = function (area) {

                                if (loadingAreas) {
                                    scope.shapes[area.aid] = {
                                        id: area.aid,
                                        alt: area.aalt,
                                        href: area.ahref,
                                        hover: 'Link to: ' + area.ahref
                                    };

                                    // tooltip on hover setup
                                    $(mapper.areas[area.aid]).attr('tooltip', '{{shapes[hoverArea].hover}}');
                                    compile(mapper.areas[area.aid])(scope);

                                    loadingAreas -= 1;

                                    if (loadingAreas == 0) {
                                        // generate a new unactive area and make the cursor operations point there.
                                        mapper.addNewArea();

                                        // unsuscribe from event
                                        mapper.config.custom_callbacks['onAreaChanged'] = null;
                                    }
                                }

                            };

                            var highlightArea = function (areaId) {

                                areaId = parseInt(areaId, 10);
                                for (var i = 0, le = mapper.areas.length; i < le; i++) {
                                    if (mapper.areas[i]) {
                                        if (areaId === mapper.areas[i].aid) {
                                            mapper.highlightArea(areaId);
                                        } else {
                                            mapper.blurArea(mapper.areas[i].aid);
                                        }
                                    }
                                }
                            };

                            var onBlurArea = function (area) {
                                if (scope.currentShape && area.aid === scope.currentShape.id) {
                                    mapper.highlightArea(area.aid);
                                }
                            };

                            timeout(function () {
                                init();
                            }, 0);

                            var init = function () {
                                if (!mapper) {

                                    // load plugin config
                                    // ReSharper disable InconsistentNaming
                                    mapper = new imgmap({
                                        // ReSharper restore InconsistentNaming
                                        mode: "editor",
                                        custom_callbacks: {
                                            //'onStatusMessage' : function(str) {gui_htmlChanged('onStatusMessage',str);},//to display status messages on gui//
                                            //'onHtmlChanged'   : function(str) {gui_htmlChanged('onHtmlChanged',str);},//to display updated html on gui		//							
                                            'onAddArea': onAddArea, //to add new form element on gui
                                            'onRemoveArea': scope.removeShape, //to remove form elements from gui
                                            'onRelaxArea': onRelaxArea, //when onStopDrawingArea/onStopResizeArea
                                            'onSelectArea': onSelectArea, //to select form element when an area is clicked
                                            'onFocusArea': onFocusArea,
                                            'onAreaChanged': loadArea,
                                            'onBlurArea': onBlurArea
                                        },
                                        pic_container: $('.mapper-body')[0],
                                        bounding_box: false,
                                        hint: '%a',
                                        label: '',
                                        CL_HIGHLIGHT_BG: '#ffff00'
                                    });

                                    scope.$watch('drawShape', onShapeChanged);
                                }

                                // load image
                                mapper.loadImage(scope.imgSource, scope.imgWidth, scope.imgHeight);

                                // has to be done after load image, because load image remove all previous existing maps
                                if (scope.mapOutput) {
                                    loadingAreas = $(scope.mapOutput).find('area').length;
                                    mapper.setMapHTML(scope.mapOutput);
                                }

                                // set shape mode
                                scope.drawShape = mapper.nextShape;
                            };

                        }
                    };
                    return dir;
                }
            ])
            .directive('addAnAccountModal', [
                 function () {
                     var dir = {
                         restrict: 'AC',
                         scope: {
                             showAccountModal: '@'
                         },
                         link: function (scope, element) {

                             scope.$watch('showAccountModal', function (newValue, oldValue) {
                                 if (newValue != oldValue && newValue) {

                                 }
                             });
                         }
                     };
                     return dir;
                 }
            ])
            .directive('bootstrapModal', [
                function () {
                    var definitionObject = {
                        restrict: 'A',
                        replace: false,
                        transclude: true,
                        scope: {
                            modalTitle: '@',
                            modalContentType: '@',
                            confirmationButton: '@',
                            cancelButton: '@',
                            showModal: '=',
                            modalContentUrl: '=',
                            closeCallback: '&',
                            confirmationCallback: '&',
                            cssClass: '@',
                            suppressX: '@'
                        },
                        templateUrl: '/partials/Directives/bootstrapModal.htm',
                        link: function (scope, element) {

                            var modal, modalBody, modalBackDrop;

                            var init = function () {

                                modal = element.find('.bootstrap-modal');
                                modalBody = modal.find('.modal-body');

                                // add the modal to the html>body element
                                modalBackDrop = element.find('.modal-backdrop');
                                modalBackDrop.appendTo('body');

                                scope.$watch('showModal', function (newValue, oldValue) {
                                    if (newValue) {

                                        // if the content type is iframe, then set a watch to instantiate the iframe
                                        if (scope.modalContentType === 'iframe') {
                                            // if we have to show the modal, then create the content
                                            modalBody.empty();
                                            var iframe = $('<iframe class="frame" height="400" frameborder="0" border="0" src="' + scope.modalContentUrl + '"></iframe>');
                                            modalBody.html(iframe);
                                        }

                                        $('body').addClass('modal-open');
                                    } else {
                                        $('body').removeClass('modal-open');
                                    }
                                });
                            };
                            
                            scope.resizeModal = function (width, height) {
                                var styleValue = '';
                                var frame = modal.find('.modal-body iframe');
                                if (width) {
                                    if (frame)
                                        frame.attr('width', width);
                                    width += 30;
                                    styleValue += 'width: ' + width + 'px !important;';
                                }

                                if (height) {
                                    if (frame)
                                        frame.attr('height', height + 2);
                                    height += 77;
                                    styleValue += 'height: ' + height + 'px !important;';
                                }

                                modal.find('.modal').attr('style', styleValue);
                            }
                            
                            scope.confirm = function () {
                                if (angular.isFunction(scope.confirmationCallback)) {
                                    scope.confirmationCallback();
                                }
                            };

                            scope.cancel = function () {
                                scope.showModal = false;

                                if (angular.isFunction(scope.closeCallback)) {
                                    scope.closeCallback();
                                }
                            };

                            var cleanup = function () {
                                modalBackDrop.remove();
                                modal.remove();
                            };

                            scope.$on('$destroy', function () {
                                cleanup();
                            });

                            init();
                        }
                    };
                    return definitionObject;
                }
            ])
            .directive('addAnAccountModal', [
                 function () {
                     var dir = {
                         restrict: 'AC',
                         scope: {
                             showAccountModal: '@'
                         },
                         link: function (scope, element) {

                             scope.$watch('showAccountModal', function (newValue, oldValue) {
                                 if (newValue != oldValue && newValue) {

                                 }
                             });
                         }
                     };
                     return dir;
                 }
            ])
            .directive('finalizedMessage', [
                '$location',
                '$window',
                function ($location, $window) {
                    var directiveObject = {
                        restrict: 'A',
                        scope: {
                            showFinalizedAlert: '='
                        },
                        replace: false,
                        templateUrl: '/partials/Directives/finalizedMessageModal.htm',
                        link: function link(scope, element) {
                            scope.exit = function () {
                                $window.location.href = 'http://' + $location.host() + ':' + $location.port() + '/MemberPages/SearchMailings.aspx?Mode=Edit&Type=Postcard&sk=' + configuration.sessionKey;
                            };
                        }
                    };
                    return directiveObject;
                }
            ])
            .directive('alertModal', [
                function () {
                    var definitionObject = {
                        restrict: 'A',
                        replace: false,
                        transclude: true,
                        scope: {
                            alertTitle: '@',
                            confirmationButton: '@',
                            cancelButton: '@',
                            showAlert: '=',
                            closeCallback: '&',
                            confirmationCallback: '&'
                        },
                        templateUrl: '/partials/Directives/alertModal.htm',
                        link: function (scope, element) {

                            var alert;

                            var init = function () {

                                alert = element.find('.alert');

                                // add the modal to the html>body element
                                alert.appendTo('body');
                                element.find('.modal-backdrop').appendTo('body');
                            };

                            scope.confirm = function () {
                                if (angular.isFunction(scope.confirmationCallback)) {
                                    scope.confirmationCallback();
                                }
                            };

                            scope.cancel = function () {
                                scope.showAlert = false;

                                if (angular.isFunction(scope.closeCallback)) {
                                    scope.closeCallback();
                                }
                            };

                            init();
                        }
                    };
                    return definitionObject;
                }
            ])
            .directive('focus', function () {
                return function (scope, element, attrs) {
                    attrs.$observe('focus', function (newValue) {
                        newValue === 'true' && element[0].focus();
                    });
                };
            })
            .directive('enter', [
                function () {
                    var definitionObject = {
                        restrict: 'A',
                        replace: false,
                        link: function (scope, element) {
                            var enter = function (e) {
                                if (e.which == 13) {
                                    return false; // do nothing
                                }
                                return true;
                            };

                            element.bind('keyup', enter);
                        }
                    };
                    return definitionObject;
                }
            ])
    }
);