define('editorSpecifications',
    ['angular', 'jquery', 'configuration'],
    function (angular, $, configuration) {
        'use strict';

        return angular
            .module('contextualDirectives', ['editor.services'])
            .directive('textEditor', [
                'editorEventsChannelService',
                function (editorEvents) {
                    var definition = {
                        restrict: 'A',
                        terminal: true,
                        scope: true,
                        link: function (scope, element) {

                            var actionType = 'Text Editor Change',
                                contentBlockId,
                                lastValue,
                                instance,
                                toolbar;

                            scope.getContent = function () {

                                // Sometimes CKEditor blur event does not get executed so we run this here
                                if (instance) {
                                    reflectDefaultValue(instance.getData());
                                }

                                var $wrapper = element.clone();

                                $wrapper.find('[contenteditable]')
                                    .removeAttr('spellcheck')
                                    .removeAttr('class')
                                    .removeAttr('role')
                                    .removeAttr('aria-label')
                                    .removeAttr('title')
                                    .removeAttr('aria-describedby')
                                    .removeAttr('tabindex')
                                    .removeAttr('contenteditable');

                                $wrapper.find('.ui-widget-overlay').remove();

                                return $wrapper;
                            };

                            /// used to add/remove the "configuration.contentBlockDefaultValue" class according to the current value
                            var reflectDefaultValue = function (editorValue) {
                                // use startWith because sometimes CKEditor picks up the overlay div
                                if (editorValue.length > configuration.defaultValueText.length) {
                                    editorValue = editorValue.substring(0, configuration.defaultValueText.length);
                                }

                                if (editorValue == configuration.defaultValueText) {
                                    element.addClass(configuration.contentBlockDefaultValue);
                                }
                                else {
                                    element.removeClass(configuration.contentBlockDefaultValue);
                                }
                            };

                            var performAction = function (actionDescriptor, isUndo) {
                                if (isUndo) {
                                    instance.setData(actionDescriptor.PreviousValue);
                                    reflectDefaultValue(actionDescriptor.PreviousValue);
                                } else {
                                    instance.setData(actionDescriptor.CurrentValue);
                                    reflectDefaultValue(actionDescriptor.CurrentValue);
                                }
                            };

                            var init = function () {
                                // jQuery events
                                $(element).delegate('.' + configuration.overlayClass, 'click', function () {
                                    if (!instance) {
                                        setupMarkup();
                                    }
                                    else {
                                        focus();
                                    }
                                });

                                editorEvents.onCanvasScrolling(scope, onScroll);
                            };

                            var onScroll = function () {
                                // check if instance has been created and if is visible

                                if (instance && toolbar && toolbar.filter(':visible').length) {
                                    // adapt to position
                                    positionToolbar();
                                }
                            };

                            var removeDefaultText = function () {
                                // remove default text when user clicks
                                var editorValue = instance.getData().trim();

                                if (editorValue.length > configuration.defaultValueText.length) {
                                    editorValue = editorValue.substring(0, configuration.defaultValueText.length);
                                }

                                if (editorValue == configuration.defaultValueText && element.hasClass(configuration.contentBlockDefaultValue)) {
                                    instance.setData('');
                                }
                            };

                            var focus = function () {

                                instance.focus();
                                removeDefaultText();
                                editorEvents.contextualEditorFocus(contentBlockId);

                                // Applying positioning on modal (needs to be done on visible dom)
                                positionToolbar();
                            };

                            var positionToolbar = function () {
                                toolbar
                                    .position({ my: 'center bottom', at: 'center top-20', of: instance.element.$, colission: 'none', within: '#' + configuration.editorHtmlContainerId });
                            };

                            var setupMarkup = function () {
                                CKEDITOR.config.scayt_autoStartup = configuration.autoSpellCheck;

                                // create instance
                                if (element.is('[data-contenteditable]')) {

                                    element.attr('contenteditable', true);
                                    instance = CKEDITOR.inline(element[0]);

                                } else {
                                    element.find('[data-contenteditable]').attr('contenteditable', true);
                                    instance = CKEDITOR.inline(element.find('[data-contenteditable]')[0]);
                                }

                                //set the initial focus
                                instance.on('instanceReady', function () {

                                    //set initial info
                                    contentBlockId = element.parents('.' + configuration.contentBlockClass + ':eq(0)').data('id');
                                    scope.editorId = instance.name;

                                    element.css('width', element.width());

                                    lastValue = instance.getData();

                                    instance.on('focus', focus);
                                    toolbar = $('#cke_' + instance.name);

                                    // trigger focus
                                    focus();
                                });

                                //set the on change event
                                instance.on('blur', function () {

                                    /// restore default text if the user doesnt set any text
                                    if (element.hasClass(configuration.contentBlockDefaultValue) && instance.getData() === '') {
                                        instance.setData(configuration.defaultValueText);
                                    }

                                    //there was a change on content?
                                    if (instance.getData() !== lastValue) {

                                        reflectDefaultValue(instance.getData());

                                        //notify "editor content changed" subscribers
                                        editorEvents.editorContentChanged(actionType, scope.editorId, contentBlockId, lastValue, instance.getData());

                                        //update our last value
                                        lastValue = instance.getData();
                                    }

                                    //execute on blur
                                    editorEvents.contextualEditorBlur(contentBlockId);

                                });

                                // undo/redo events
                                editorEvents.onPerformUndoRedo(scope, performAction);
                            };

                            init();

                        }
                    };

                    return definition;
                }
            ])
            .directive('imageEditor', [
                'editorEventsChannelService',
                '$timeout',
                function (editorEvents, timeout) {
                    var definition = {
                        restrict: 'A',
                        scope: true,
                        terminal: true,
                        link: function (scope, element) {

                            var actionType = 'Image Editor Change',
                                lastValue,
                                contentBlockId,
                                modalScope,
                                defaultValue;

                            scope.getContent = function () {

                                var $wrapper = element.clone();

                                // clean up img attrs if user has changed it
                                // otherwise leave alone so when user returns the image content blocks still work
                                var isDefault = $wrapper.find('img').attr('src').indexOf('/Images/LayoutPreviews/') > -1;

                                if (!isDefault) {
                                    $wrapper.find('img')
                                        .removeAttr('class')
                                        .removeAttr('style')
                                        .removeAttr('data-max-width');
                                }

                                // Find the image editor to remove the resizable elements
                                var cleanHtml;
                                if ($wrapper.find('img').parent('a').length) {

                                    // enabling image editor links
                                    var dataHref = $wrapper.find('img').parent('a').attr('data-editor-href');
                                    $wrapper.find('img').parent('a').attr('href', dataHref);

                                    // copy only useful markup
                                    cleanHtml = $wrapper.find('img').parent('a');
                                } else {
                                    cleanHtml = $wrapper.find('img, map');
                                }

                                // Replace the html with the resizable elements with just the img and the mapping
                                $wrapper.empty().append(cleanHtml);

                                return $wrapper;
                            };

                            var init = function () {

                                timeout(function () {
                                    // this creates the default resize dom structure.
                                    if (!element.find('map').length) {
                                        setupCanvasResize();
                                    }
                                }, 0);

                                element.parents('.' + configuration.contentBlockClass)
                                    .on('mouseover.imageEditor', function (evt) {

                                        // ensure z-index = 1
                                        if (element.find('.' + configuration.overlayClass).length) {

                                            element.find('.' + configuration.overlayClass).zIndex(1);

                                            // unsubscribe for this event
                                            element.parents('.' + configuration.contentBlockClass).off('mouseover.imageEditor');

                                            /******** Get Content BlockId *******/
                                            contentBlockId = element.parents('.' + configuration.contentBlockClass).data('id');
                                            scope.editorId = 'Image Editor #' + contentBlockId + Math.random();

                                            //set events
                                            element.delegate('.' + configuration.overlayClass, {
                                                mouseover: onMouseOver,
                                                click: onClick
                                            });
                                        }
                                    });

                                element.find('img').on('error', function onimgerror(ev) {
                                    if (lastValue && lastValue.src) {
                                        $(ev.currentTarget).attr('src', lastValue.src);
                                    }
                                });

                                // get modal scope
                                if (!$('.' + configuration.imageEditorModal).length) {
                                    scope.$on('IMAGE_MODAL_READY', function (event, editorModalScope) {
                                        modalScope = editorModalScope;
                                    });
                                } else {
                                    modalScope = angular.element('.' + configuration.imageEditorModal).scope();
                                }

                                // undo/redo events
                                editorEvents.onPerformUndoRedo(scope, performAction);

                                // subscribe to modal event
                                scope.$on('IMAGE_EDITOR_CHANGED', imageEditorChanged);
                            };

                            var onClick = function () {
                                scope.safeApply(function () {
                                    setupImageData();
                                    modalScope.validFile = true;
                                    modalScope.show();
                                });
                            };

                            var getImageAlignment = function () {
                                return element.closest('td').attr('align') || 'center';
                            };

                            var setupImageData = function () {

                                if (!lastValue) {
                                    var imgTarget = element.find('map').length ? element.find('img') : element.find('.ui-wrapper img');

                                    lastValue = {
                                        maxWidth: parseInt(imgTarget.attr('data-max-width')),
                                        src: imgTarget.attr('src'),
                                        alt: imgTarget.attr('alt'),
                                        fileWidth: parseInt(imgTarget.attr('data-file-width')),
                                        fileHeight: parseInt(imgTarget.attr('data-file-height')),
                                        id: imgTarget.attr('data-file-id'),
                                        width: parseInt(imgTarget.attr('width')),
                                        height: parseInt(imgTarget.attr('height')),
                                        linkto: imgTarget.parent('a').attr('data-editor-href'),
                                        map: $.fn.outerHTML(imgTarget.siblings('map:eq(0)')),
                                        alignEnabled: imgTarget.attr('data-align-enabled'),
                                        align: getImageAlignment()
                                    };

                                    if (!defaultValue) {
                                        defaultValue = lastValue;
                                    }
                                }

                                modalScope.imageData.maxWidth = lastValue.maxWidth;
                                modalScope.imageData.src = lastValue.src;
                                modalScope.imageData.alt = lastValue.alt;
                                modalScope.imageData.fileWidth = lastValue.fileWidth;
                                modalScope.imageData.fileHeight = lastValue.fileHeight;
                                modalScope.imageData.id = lastValue.id;
                                modalScope.imageData.width = lastValue.width;
                                modalScope.imageData.height = lastValue.height;
                                modalScope.imageData.linkto = lastValue.linkto;
                                modalScope.imageData.map = lastValue.map;
                                modalScope.mapperOutput = modalScope.imageData.map;
                                modalScope.previewSrc = modalScope.imageData.src;
                                modalScope.editorId = scope.editorId;
                                modalScope.imageData.alignEnabled = lastValue.alignEnabled;
                                modalScope.imageData.align = lastValue.align;
                            };

                            var imageEditorChanged = function (event, message) {
                                if (modalScope.editorId == scope.editorId && message.data !== lastValue) {

                                    saveChangesInDom(message.data);

                                    // notify "editor content changed" subscribers
                                    editorEvents.editorContentChanged(actionType, scope.editorId, contentBlockId, lastValue, message.data);

                                    // update our last value
                                    lastValue = message.data;
                                }
                            };

                            var performAction = function (actionDescriptor, isUndo) {
                                if (isUndo) {
                                    saveChangesInDom(actionDescriptor.PreviousValue);
                                    lastValue = actionDescriptor.PreviousValue;
                                } else {
                                    saveChangesInDom(actionDescriptor.CurrentValue);
                                    lastValue = actionDescriptor.CurrentValue;
                                }
                            };

                            var disableResizables = function () {
                                element.parents('.' + configuration.canvasClass)
                                        .find('.ui-wrapper img')
                                        .resizable('disable');
                            };

                            var onMouseOver = function (evt) {
                                // prevent bubbling
                                evt.stopImmediatePropagation();

                                if (element.find('.ui-wrapper').length) {
                                    disableResizables();
                                    if (!element.find('.ui-wrapper img[usemap]').length) {
                                        element.find('.ui-wrapper img').resizable('enable');
                                    }

                                }
                            };

                            var setupCanvasResize = function () {

                                disableResizables();

                                /***** Image Resize on Canvas *****/
                                var imgTarget = element.find('img');

                                if (!imgTarget.siblings('map').length) {

                                    // Remove the style width/height from the parent element of the img
                                    element.css({ 'width': '', 'height': '' });

                                    var width = Number(imgTarget.attr('width')),
                                        height = Number(imgTarget.attr('height')),
                                        ratio = width / height,
                                        minW = width * 0.1,
                                        minH = height * 0.1,
                                        maxW,
                                        maxH;

                                    var siblings = element.siblings('[editable]').length;
                                    var layoutTable = $('.layoutTable');
                                    var maxContainerWidth = parseInt(Number(layoutTable.parents('[width]:eq(0)').attr('width')) * (parseInt(layoutTable.attr('width'), 10) / 100), 10);

                                    //                                    var maxContainerWidth = element.parent().width();

                                    // each sibling could fill min the 10% of maxContainerWidth
                                    var maxAvailableWidth = maxContainerWidth * (1 - (siblings / 10));

                                    maxW = maxAvailableWidth > Number(imgTarget.attr('data-file-width')) ? Number(imgTarget.attr('data-file-width')) : maxAvailableWidth;
                                    maxH = (maxW / width) * height;

                                    imgTarget.attr({ 'data-max-width': maxAvailableWidth, 'width': maxW, 'height': maxH });
                                                                        
                                    imgTarget.resizable({
                                        aspectRatio: ratio,
                                        minWidth: minW,
                                        minHeight: minH,
                                        maxWidth: maxW,
                                        maxHeight: maxH,
                                        handles: "all",
                                        start: function () {
                                            editorEvents.contextualEditorFocus(contentBlockId);
                                        },
                                        stop: function (event, ui) {
                                            editorEvents.contextualEditorBlur(contentBlockId);

                                            if (ui.size.width != ui.originalSize.width
                                                && ui.size.height != ui.originalSize.height) {
                                                scope.safeApply(function () {

                                                    // setup the image data before change
                                                    setupImageData();

                                                    // change width and height
                                                    var changedMessage = {
                                                        data: angular.copy(lastValue)
                                                    };

                                                    changedMessage.data.width = ui.size.width;
                                                    changedMessage.data.height = ui.size.height;

                                                    // persist changes
                                                    imageEditorChanged({}, changedMessage);
                                                });
                                            }
                                        }
                                    });
                                }
                            };

                            var saveChangesInDom = function (imageData) {
                                var resizable = element.find('.ui-wrapper');

                                // remove/add class indicating whether the content block has changed its default value
                                if (angular.equals(imageData, defaultValue)) {
                                    element.addClass(configuration.contentBlockDefaultValue);
                                }
                                else {
                                    element.removeClass(configuration.contentBlockDefaultValue);
                                }

                                // check if the image has changed to update the manual resize
                                if (resizable.find('img').attr('src') != imageData.src) {

                                    var maxAvailableWidth = resizable.find('img').attr('data-max-width');

                                    var ratio = Number(imageData.width) / Number(imageData.height),
                                        minW = Number(imageData.width) * 0.1,
                                        minH = Number(imageData.height) * 0.1,
                                        maxW = maxAvailableWidth > Number(imageData.fileWidth) ? Number(imageData.fileWidth) : maxAvailableWidth,
                                        maxH = (maxW / Number(imageData.width)) * Number(imageData.height);

                                    // update the manual resize
                                    resizable.find('img').resizable('option', {
                                        aspectRatio: ratio,
                                        minWidth: minW,
                                        minHeight: minH,
                                        maxWidth: maxW,
                                        maxHeight: maxH
                                    });
                                }

                                // update img attr
                                resizable.find('img').attr({
                                    'src': imageData.src,
                                    'height': maxAvailableWidth < imageData.width ? maxH : imageData.height,
                                    'width': maxAvailableWidth < imageData.width ? maxW : imageData.width,
                                    'data-file-id': imageData.id,
                                    'data-file-width': imageData.fileWidth,
                                    'data-file-height': imageData.fileHeight,
                                    'alt': imageData.alt,
                                    'data-map': !!imageData.map
                                });

                                var resizableCss = {
                                    width: maxAvailableWidth < imageData.width ? maxW : imageData.width,
                                    height: maxAvailableWidth < imageData.width ? maxH : imageData.height
                                };

                                // update resizable css
                                resizable.css(resizableCss);
                                resizable.closest('td').attr('align', imageData.align);

                                // update img css
                                resizable.find('img').css(resizableCss);

                                var link = resizable.find('> a');

                                // update if link to is present
                                if (imageData.linkto) {

                                    if (link.length) {
                                        link.attr('data-editor-href', imageData.linkto);
                                    } else {
                                        link = $('<a href="javascript:;" data-editor-href="' + imageData.linkto + '"></a>').append(element.find('img'));
                                        resizable.append(link);
                                    }
                                } else if (link.length) {
                                    //remove link and let image
                                    resizable.append(link.find('img'));
                                    link.remove();
                                }

                                var previousMap = resizable.find('map');

                                if (imageData.map) {

                                    if (previousMap.length) {
                                        previousMap.remove();
                                    }
                                    var newMap = $(imageData.map);
                                    newMap.appendTo(element.find('img').parent());
                                    resizable.find('img').attr('useMap', '#' + newMap.attr('id'));

                                } else if (previousMap.length) {
                                    previousMap.remove();
                                    resizable.find('img').removeAttr('useMap');
                                }
                            };

                            init();
                        }
                    };
                    return definition;
                }
            ])
            .directive('redeemButtonEditor', [
                'editorEventsChannelService',
                function (editorEvents) {
                    var definition = {
                        restrict: 'A',
                        terminal: true,
                        scope: true,
                        link: function (scope, element) {

                            var actionType = 'Redeem Button Editor Change',
                                contentBlockId,
                                lastValue,
                                instance;

                            scope.getContent = function () {
                                var $wrapper = element.clone();

                                if ($wrapper.find('a').length) {
                                    // restore URL
                                    var dataHref = $wrapper.find('a').attr('data-editor-href');
                                    if (dataHref) {
                                        $wrapper.find('a').attr('href', dataHref);
                                        $wrapper.find('a').removeAttr('data-editor-href');
                                    }
                                }

                                return $wrapper;
                            };
                        }
                    };
                    return definition;
                }
            ])
            .directive('dividerEditor', [
                'editorEventsChannelService',
                function (editorEvents) {
                    var definition = {
                        restrict: 'A',
                        terminal: true,
                        scope: true,
                        link: function (scope, element) {

                            var actionType = 'Divider Editor Change',
                                contentBlockId,
                                lastValue,
                                instance;

                            scope.getContent = function () {

                                return element.clone();
                            };
                        }
                    };
                    return definition;
                }
            ]);
    });