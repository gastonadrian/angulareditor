define('controllers', 
    ['angular', 'configuration']
    , function (angular, configuration) {
        'use strict';

        angular.module('editor.controllers', [])
            .controller('SelectDesignCtrl', ['$scope',
                '$location',
                '$routeParams',
                'messageService',
                'editorEventsChannelService',
                function (scope, location, routeParams, messageService, editorEvents) {

                    scope.pageIndex = 0;
                    scope.pageSize = 20;
                    scope.pageCount = 15;
                    scope.parentId = '';
                    scope.searchText = '';
                    scope.preselectedDesign = parseInt(routeParams.designId);
                    scope.messageHeader = {
                        name: '',
                        design: 0
                    };

                    var saveOptions = {
                        generatePreview: false,
                        forceSave: true
                    };

                    var init = function () {
                        if (!scope.preselectedDesign) {
                            getDesigns();
                        }

                        $('#searchText').bind('keyup', enter);
                        editorEvents.onUserSaveContent(scope, userSave);
                    };

                    var userSave = function () {
                        messageService.save(saveOptions, function () {
                            location.url(configuration.steps[1].url);
                        });
                    };

                    var getDesigns = function () {
                        messageService.getDesigns({ pageIndex: scope.pageIndex, pageSize: scope.pageSize, parentId: scope.parentId == -2 ? null : scope.parentId, searchText: scope.searchText }, function (data) {
                            scope.designs = data.Rows;
                            var pageCount = Math.ceil(data.TotalRowCount / scope.pageSize);

                            if (pageCount == 0) {
                                pageCount = 1;
                            }

                            scope.pageCount = pageCount;
                        });
                    };

                    scope.updateParentId = function (selected, searchText) {
                        scope.pageIndex = 0;
                        scope.parentId = selected;
                        scope.searchText = searchText;
                        getDesigns();
                    };

                    scope.updatePageSize = function (pageSize) {
                        scope.pageIndex = 0;
                        scope.pageSize = pageSize;
                        getDesigns();
                    };

                    scope.control = {};

                    var enter = function (e) {
                        if (e.which == 13) {
                            scope.searchDesigns();
                            scope.$digest();
                        }
                        return true;
                    };

                    scope.searchDesigns = function () {
                        scope.pageIndex = 0;
                        scope.control.getFolders();
                        getDesigns();
                    };

                    scope.nextPage = function () {
                        scope.pageIndex++;
                        getDesigns();
                    };

                    scope.prevPage = function () {
                        scope.pageIndex--;
                        getDesigns();
                    };

                    scope.setName = function () {
                        if (scope.preselectedDesign) {
                            scope.messageHeader.design = scope.preselectedDesign;
                            messageService.setHeader(scope.messageHeader);
                            messageService.save(saveOptions, function () {
                                location.url(configuration.steps[2].url);
                            });
                        }
                        else {
                            messageService.setHeader(scope.messageHeader);
                        }
                    };

                    scope.selectDesign = function (designId) {
                        scope.messageHeader.design = designId;
                        messageService.setHeader(scope.messageHeader);
                        messageService.save(saveOptions, function () {
                            location.url(configuration.steps[1].url);
                        });
                    };

                    scope.toggleFavorite = function (design) {
                        if (design.favorite) {
                            messageService.removeFavoriteDesign({ designId: design.id });
                            design.favorite = false;
                        } else {
                            messageService.addFavoriteDesign({ designId: design.id });
                            design.favorite = true;
                        }

                        scope.searchDesigns();
                    };

                    init();
                }
            ])
            .controller('SelectLayoutCtrl', ['$scope',
                'messageService',
                '$location',
                function (scope, messageService, location) {

                    scope.showSelectLayoutModal = true;
                    scope.layouts = messageService.getLayouts();

                    scope.closeCallback = function () {
                        scope.showSelectLayoutModal = false;
                        location.url(configuration.steps[0].url);
                    };

                    scope.confirmationCallback = function () {
                        messageService.setHeader({ layout: scope.layouts[0].id });
                        scope.showSelectLayoutModal = false;
                        messageService.save({ generatePreview: false, forceSave: true }, function () {
                            location.url(configuration.steps[2].url);
                        });
                    };
                }
            ])
            .controller('EditContentCtrl', ['$scope',
                'messageService',
                'userChangeService',
                'editorEventsChannelService',
                '$location',
                '$sce',
                '$compile',
                '$routeParams',
                function (scope, messageService, userChangeService, editorEvents, $location, $sce, compile, $routeParams) {

                    var autoSaveInitialized = false;
                    scope.undoEnabled = false;
                    scope.redoEnabled = false;
                    scope.submitted = false;
                    scope.alreadyValidated = false;

                    var init = function () {

                        // get message data like message name/subject/from
                        scope.messageData = messageService.getHeader(function (msgData) {

                            if (!parseInt($routeParams.messageId) && !msgData.id) {
                                // the user is trying to create a new message with defaults
                                // create message with design/layout selected
                                messageService.add(compileMessageHtml, { generatePreview: true });
                            }
                            else {
                                // the user is coming from step2 or is coming from "emails admin page"

                                //if the user is not coming from edit emails page (or any other page other than editor flow)
                                // then: request the message without details
                                messageService.get({ withDetails: !msgData.id, id: parseInt($routeParams.messageId) }, function (data) {

                                    if (!msgData.id) {
                                        // we call again for the msg header bc in the first call was empty
                                        scope.messageData = messageService.getHeader(function (newMsgData) {
                                            scope.layoutContentBlocks = messageService.getContentBlocks({ designId: newMsgData.design });
                                        });
                                    }
                                    else {
                                        scope.layoutContentBlocks = messageService.getContentBlocks({ designId: msgData.design });
                                    }

                                    compileMessageHtml(data);
                                });
                            }

                            // set a watcher to update the changes on header
                            scope.$watch('messageData.subject + messageData.from + messageData.name', function (newValue, oldValue) {
                                if (newValue != oldValue) {
                                    messageService.setHeader(scope.messageData);
                                }
                            });
                        });
                    };

                    var compileMessageHtml = function (backendMessage) {
                        scope.editor = compile(backendMessage.Html)(scope);
                    };

                    scope.contentChanged = function (actionType, target, contentBlockId, oldValue, newValue) {
                        editorEvents.editorContentChanged(actionType, target, contentBlockId, oldValue, newValue);
                    };

                    scope.onContentChanged = function (actionType, target, contentBlockId, oldValue, newValue) {

                        // save changes on browser local storage
                        userChangeService.saveChanges(actionType, target, contentBlockId, oldValue, newValue);
                        scope.undoEnabled = true;
                        scope.redoEnabled = false;

                        // init the scheduling for autosave after first modification
                        if (!autoSaveInitialized) {
                            editorEvents.autoSaveContent();
                            autoSaveInitialized = true;
                        }

                        if (!scope.$$phase) {
                            scope.$digest();
                        }
                    };

                    scope.finishRejectedDrop = function () {
                        scope.undoEnabled = true;
                        scope.redoEnabled = false;

                        if (!scope.$$phase) {
                            scope.$digest();
                        }
                    }

                    var userSave = function (options) {
                        options.forceSave = true;
                        options.updateInEnterprise = true;
                        scope.save(options);
                    };

                    scope.save = function (options, callback) {

                        options = options || { updateInEnterprise: true, forceSave: true };

                        var editableContent = scope.getUserContent().editableContent;

                        var updateData = {
                            editableContent: scope.getUserContent().editableContent,
                            subject: scope.messageData.subject
                        };

                        var updateCallback = function () {
                            editorEvents.successfulSave();

                            if (angular.isFunction(callback)) {
                                callback();
                            }
                        };

                        messageService.update(updateData, options, updateCallback);
                    };

                    scope.undo = function () {
                        var actionToUndo = userChangeService.saveUndo();
                        if (actionToUndo) {
                            handleUndoRedo(actionToUndo, true);
                        }
                    };

                    scope.redo = function () {
                        var actionToRedo = userChangeService.saveRedo();
                        if (actionToRedo) {
                            handleUndoRedo(actionToRedo, false);
                        }
                    };

                    var handleUndoRedo = function (actionToPerform, isUndo) {
                        scope.redoEnabled = isUndo ? true : !!actionToPerform.remainingActions;
                        scope.undoEnabled = isUndo ? !!actionToPerform.remainingActions : true;

                        if (actionToPerform.action.Description == configuration.contentBlockEvents.Reordered) {
                            scope.performReorder(actionToPerform.action, isUndo);
                        } else if (actionToPerform.action.Description == configuration.contentBlockEvents.Deleted) {
                            scope.performDeleteOrCreate(actionToPerform.action, isUndo, true);
                        } else if (actionToPerform.action.Description == configuration.contentBlockEvents.Created) {
                            scope.performDeleteOrCreate(actionToPerform.action, isUndo, false);
                        } else {
                            // call editor
                            editorEvents.performUndoRedo(actionToPerform.action, isUndo);
                        }
                    };

                    // send a test
                    scope.showSendATest = function () {

                        if (!!scope.messageData.id) {

                            // default store
                            scope.store = { Name: 'Preview with my member profile', Id: 0 };

                            // update in enterprise to have latest preview available for next steps
                            scope.save({ updateInEnterprise: true, forceSave: true, notifyEnterpriseSuccess: true }, function () {
                                // show popup
                                scope.showSendATestModal = true;
                            });
                        }
                    };

                    scope.validateStep4 = function (event, newRoute) {

                        if (scope.alreadyValidated) {
                            $location.url(configuration.steps[3].url);
                        }
                        else {
                            event.preventDefault();
                        }

                        scope.submitted = true;

                        // Perform validation if the newRoute is for Step3 or Step4
                        var step4Path = configuration.steps[3].url;

                        if (newRoute.toLowerCase().indexOf('sendatestvalidationmessage') >= 0) {
                            event.preventDefault();
                        }

                        if (newRoute.indexOf(step4Path) > -1) {

                            var valid = true;
                            var strResult = 'Please fill required fields before moving on: \n';

                            if (!scope.messageData.subject) {
                                strResult += '\n Subject \n';
                                valid = false;
                            }

                            if (!scope.messageData.from) {
                                strResult += '\n From \n';
                                valid = false;
                            }

                            if (!scope.messageData.name) {
                                strResult += '\n Name \n';
                                valid = false;
                            }

                            if (!valid) {
                                alert(strResult);
                            } else {
                                // update message if there is a pending change.
                                // does not update the results on enterprise.   
                                // save on backend only if there was some content change that wasn't save.
                                scope.save({ forceSave: true, updateInEnterprise: true, showAlert: true },
                                function () {
                                    scope.alreadyValidated = true;
                                    $location.url(configuration.steps[3].url);
                                });
                            }
                        }
                    };

                    init();

                    // handlers for editor events
                    editorEvents.onEditorContentChanged(scope, scope.onContentChanged);
                    editorEvents.onUserSaveContent(scope, userSave);
                    editorEvents.onAutoSaveContent(scope, function () {
                        scope.save({ updateInEnterprise: true, forceSave: false, isAutosave: true });
                    });
                    editorEvents.onRouteChanged(scope, scope.validateStep4);
                }
            ])
            .controller('SelectMembersCtrl', ['$scope',
                'editorEventsChannelService',
                'messageService',
                '$filter',
                'dataContext',
                '$location',
                '$window',
                function (scope, editorEvents, messageService, filter, dc, $location, $window) {

                    scope.datepickerClick = function () {
                        if (scope.sendNow === 'true') {
                            scope.safeApply(function () {
                                scope.sendNow = 'false';
                                scope.sendNowChanged();
                            });
                        }
                    };

                    var initMembersPanel = function () {

                        // DataBind Properties
                        scope.guestCodes = []; //[]
                        scope.recipientLists = []; //[]
                        scope.recipientStores = null; //[]

                        // Selected Models
                        scope.selectedList = {};
                        scope.selectedGuestCodes = [];

                        // Misc. Model
                        scope.recipientCount = 0;
                        scope.countLookupByList = [];
                        scope.countLookupByGuestCode = [];
                        scope.defaultListId = 0;
                        scope.guestCodesUpdated = false;

                        // setup lists, guest codes and stores
                        messageService.getLists(function (data) {

                            var lists = [];

                            angular.forEach(data, function (value) {
                                value.Name = value.Name + ' (' + (value.MemberCount) + ')';

                                if (value.Default) {
                                    scope.selectedList = value;
                                    scope.defaultListId = value.Id;
                                }

                                this.push(value);

                            }, lists);

                            // Guest Codes
                            scope.guestCodes = messageService.getGuestCodes(function (guestCodeResponse) {
                                if (guestCodeResponse.length) {
                                    lists.push({
                                        Name: 'Select guest codes:',
                                        Id: 0
                                    });
                                }

                                scope.recipientLists = lists;

                                // get stores
                                scope.recipientStores = messageService.getStores({ listId: scope.selectedList.Id }, function (storeData) {

                                    updateCountLookupArray(storeData);

                                    // update recipients count
                                    scope.$watch('selectedList.Id + selectedStores()', function () {
                                        scope.updateRecipientCount();
                                        scope.scheduleEnabled = !!scope.selectedStores().length;
                                    });

                                });
                            });
                        });
                    };

                    var initSocialMediaPanel = function () {

                        // databind model
                        scope.accounts = null; //[];

                        // selected model
                        scope.selectedSocialAccounts = [];
                        scope.socialMediaIncludePreview = true;
                        scope.socialMediaEnabled = configuration.hasSocialMediaEnabled;
                        scope.learnMoreAboutSocialUrl = '/SocialMedia/Modal_SocialMediaMarketing.aspx?sk=' + configuration.sessionKey + '&page=' + location.absUrl + '&action=Compose New Email - Step 4&type=sm';
                        scope.addAccountModalUrl = '/SocialMedia/Modal_AccountAdd.aspx?fbPagesOnly=0&sk=' + configuration.sessionKey;
                        scope.showLearnMoreSocialModal = false;
                        scope.showAddAccountModal = false;
                        scope.foursquareSocialMediaTypeId = configuration.foursquareSocialMediaTypeId;
                        scope.twitterSocialMediaTypeId = configuration.twitterSocialMediaTypeId;
                        scope.facebookSocialMediaTypeId = configuration.facebookSocialMediaTypeId;
                        scope.socialMediaPostCharactersLeft = configuration.facebookPostMaxLegnth;
                        scope.socialMediaPostMaxLength = configuration.facebookPostMaxLegnth;
                        scope.fullSupportedClient = configuration.isFullSupportedClient;

                        var messageData = messageService.getHeader();
                        scope.socialMediaMessage = messageData.subject;

                        if (messageData.hasCoupon) {
                            scope.socialMediaMessage += configuration.couponCodeLabelText + messageData.couponCode;
                        }

                        getSocialAccounts();

                        scope.$watch('socialMediaMessage + socialMediaPostMaxLength + socialMediaIncludePreview', function (newValue, oldValue) {
                            if (newValue !== oldValue) {
                                scope.socialMediaPostCharactersLeft = scope.socialMediaPostMaxLength - (scope.socialMediaMessage ? scope.socialMediaMessage.length : 0);

                                if (scope.socialMediaPostCharactersLeft < 0) {
                                    scope.socialMediaMessage = scope.socialMediaMessage.substr(0, scope.socialMediaPostMaxLength);
                                }
                            }
                        });

                    };

                    var initSendTimePanel = function () {

                        scope.selectedHour = null; //'string'

                        scope.timeZone = configuration.timeZone;
                        scope.selectedDate = filter('date')(new Date((new Date()).valueOf() + 1000 * 3600 * 24), 'shortDate');
                        scope.sendNow = 'true';

                        dc.getTimeZoneConfiguration(function (data) {
                            scope.selectedHour = data.hourToSend;
                            scope.populateTime(data.hourToSend);
                        });
                    };

                    var init = function () {
                        initMembersPanel();
                        initSocialMediaPanel();
                        initSendTimePanel();

                        setEditValues();

                        editorEvents.onUserSaveContent(scope, userSave);
                        editorEvents.onAutoSaveContent(scope, autoSave);

                        $window.onbeforeunload = function () {
                            if (scope.sendNow !== 'true') {
                                return 'Are you sure?  Your mailing has been Saved and not Scheduled to send.  Click the blue Schedule button to send your mailing at your denoted time.';
                            }
                        };
                    };

                    /******* METHODS *******/

                    var setEditValues = function () {
                        var removeWatcher = scope.$watch('recipientStores + accounts + selectedHour', function () {
                            if (scope.countLookupByList.length
                                && (!scope.socialMediaEnabled || (scope.socialMediaEnabled && scope.accounts !== null && scope.accounts.$resolved))
                                && scope.selectedHour !== null) {

                                removeWatcher();

                                var scheduleData = messageService.getScheduleData();

                                // scheduleData.list is null if the schedule data were never saved
                                if (!scheduleData.list) {
                                    // init autosave
                                    editorEvents.autoSaveContentWithDelay();
                                    return;
                                }

                                if (scheduleData.guestCodes && scheduleData.guestCodes.length) {

                                    scope.selectedList = scope.recipientLists[scope.recipientLists.length - 1];

                                    for (var j = 0; j < scheduleData.guestCodes.length; j++) {
                                        scope.selectedGuestCodes.push(scheduleData.guestCodes[j]);
                                    }

                                } else {
                                    for (var i = 0; i < scope.recipientLists.length; i++) {
                                        if (scope.recipientLists[i].Id === scheduleData.list.Id) {
                                            scope.selectedList = scope.recipientLists[i];
                                            break;
                                        }
                                    }
                                }

                                if (scheduleData.stores && scheduleData.stores.length) {
                                    for (var k = 0; k < scheduleData.stores.length; k++) {
                                        for (var l = 0; l < scope.recipientStores.length; l++) {
                                            if (scope.recipientStores[l].Id === scheduleData.stores[k].Id) {
                                                scope.recipientStores[l].checked = true;
                                                break;
                                            }
                                        }
                                    }
                                }

                                if (scheduleData.socialMediaAccounts) {
                                    for (var m = 0; m < scheduleData.socialMediaAccounts.length; m++) {
                                        for (var n = 0; n < scope.accounts.length; n++) {
                                            if (scheduleData.socialMediaAccounts[m].Id === scope.accounts[n].Id) {
                                                scope.accounts[n].Selected = true;
                                                break;
                                            }
                                        }
                                    }

                                    updateSelectedSocialAccounts();
                                }

                                if (scheduleData.socialMediaMessage != null) {
                                    scope.socialMediaMessage = scheduleData.socialMediaMessage;
                                }

                                scope.socialMediaIncludePreview = scheduleData.includePreviewInSocialMediaPost;

                                scope.sendNow = scheduleData.sendNow ? 'true' : 'false';

                                if (scheduleData.time && !scheduleData.sendNow) {
                                    var hours = parseInt(scheduleData.time);

                                    if (scheduleData.time.toUpperCase().indexOf("PM") > 0) {
                                        hours += 12;
                                    }

                                    var minutes = parseInt(scheduleData.time.substr(scheduleData.time.indexOf(":") + 1, 2));
                                    scheduleData.time = hours + (minutes / 60);

                                    scope.selectedHour = scheduleData.time;
                                    scope.populateTime(scope.selectedHour);
                                    scope.selectedDate = scheduleData.date;
                                }

                                // init autosave after 30 seconds
                                editorEvents.autoSaveContentWithDelay();
                            }
                        });
                    };


                    /* PANEL 1 */
                    scope.selectedStores = function () {
                        var filtered = filter('filter')(scope.recipientStores, { checked: true });
                        var result = [];
                        angular.forEach(filtered, function (obj) {
                            result.push(obj.Id);
                        }, result);

                        return result;
                    };

                    scope.checkAll = function (checked) {
                        angular.forEach(scope.recipientStores, function (obj) {
                            obj.checked = checked;
                        });
                    };

                    scope.updateCount = function () {
                        if (scope.guestCodesUpdated) {
                            scope.guestCodesUpdated = false;
                            scope.updateRecipientCount();
                        }
                    };

                    var updateCountLookupArray = function (storeData) {
                        var tempLookup = { listId: scope.selectedList.Id, storeData: storeData };
                        scope.countLookupByList.push(tempLookup);
                        calculateRecipientCountByList(tempLookup);
                    };

                    scope.updateRecipientCount = function () {
                        // 1: List is selected & not using guest code
                        if (scope.selectedList.Id > 0) {
                            var listLookup = filter('filter')(scope.countLookupByList, { listId: scope.selectedList.Id });
                            if (!listLookup.length) {
                                messageService.getStores({ listId: scope.selectedList.Id }, updateCountLookupArray);
                            } else {
                                calculateRecipientCountByList(listLookup[0]);
                            }
                        } else {
                            // 2: No list selected & not using guest code
                            if (scope.guestCodes.length == 0 || scope.selectedGuestCodes.length == 0 || scope.selectedStores().length == 0) {
                                scope.recipientCount = 0;
                            } else { // 3: Using guest code                                
                                messageService.getRecipientCount(
                                    { selectedStores: scope.selectedStores(), selectedList: scope.defaultListId, selectedGuestCodes: scope.selectedGuestCodes },
                                    function (data) {
                                        scope.recipientCount = data.recipientCount;
                                    });
                            }
                        }
                    };

                    var calculateRecipientCountByList = function (listLookup) {
                        var count = 0;
                        if (listLookup) {
                            angular.forEach(scope.selectedStores(), function (obj) {
                                var store = filter('filter')(listLookup.storeData, { Id: obj });
                                if (store != null && store.length) {
                                    count += store[0].MemberCount;
                                }
                            });
                        }
                        scope.recipientCount = count;
                    };

                    /* END PANEL 1*/
                    /* PANEL 2 */

                    var updateSelectedSocialAccounts = function () {
                        var filtered = filter('filter')(scope.accounts, { Selected: true });
                        var result = [];

                        angular.forEach(filtered, function (obj) {
                            result.push(obj.Id);
                        }, result);

                        scope.selectedSocialAccounts = result;

                        updateSocialMediaPostMaxLength(filtered);

                        return result;
                    };

                    var getSocialAccounts = function () {
                        if (scope.socialMediaEnabled) {
                            scope.accounts = messageService.getSocialMediaAccounts();
                        }
                    };

                    scope.addAccountClosed = function () {
                        // refresh list of sma
                        getSocialAccounts();
                    };

                    var updateSocialMediaPostMaxLength = function (selectedAccounts) {

                        var maxLength = configuration.facebookPostMaxLegnth;

                        for (var i = 0; i < selectedAccounts.length; i++) {

                            if (selectedAccounts[i].SocialMediaTypeId === scope.foursquareSocialMediaTypeId
                                    && maxLength > configuration.foursquarePostMaxLength) {
                                maxLength = configuration.foursquarePostMaxLength;
                                continue;
                            }

                            if (selectedAccounts[i].SocialMediaTypeId === scope.twitterSocialMediaTypeId
                                    && maxLength > configuration.twitterPostMaxLength) {

                                if (scope.socialMediaIncludePreview) {
                                    maxLength = configuration.twitterPostMaxLength - configuration.socialMediaPreviewLength;
                                }
                                else {
                                    maxLength = configuration.twitterPostMaxLength;
                                }
                            }
                        }
                        scope.socialMediaPostMaxLength = maxLength;
                    };

                    var getSelectedSocialAccountNickNames = function () {
                        var filtered = filter('filter')(scope.accounts, { Selected: true });
                        var nickNames = '';

                        angular.forEach(filtered, function (obj) {
                            nickNames += obj.NickName + ', ';
                        });

                        if (filtered && filtered.length) {
                            nickNames = nickNames.substr(0, nickNames.length - 2);
                        }

                        return nickNames;
                    };

                    scope.selectAccount = function (index) {
                        scope.accounts[index].Selected = !scope.accounts[index].Selected;
                        updateSelectedSocialAccounts();
                    };

                    scope.selectAllAccounts = function (isSelect) {
                        for (var i = 0; i < scope.accounts.length; i++) {
                            scope.accounts[i].Selected = isSelect;
                        }
                        updateSelectedSocialAccounts();
                    };

                    /* PANEL 3 */
                    scope.sendNowChanged = function () {
                        if (scope.sendNow === 'true') {
                            scope.selectedDate = filter('date')(new Date(), 'shortDate');
                        }
                        else {
                            scope.selectedDate = filter('date')(new Date((new Date()).valueOf() + 1000 * 3600 * 24), 'shortDate');
                        }
                        scope.populateTime(new Date().getHours());
                    };

                    scope.populateTime = function (hours) {
                        if (hours > 12) {
                            hours = hours - 12;
                            scope.selectedAmPmFull = "pm";
                        } else {
                            scope.selectedAmPmFull = "am";
                        }

                        if (hours == 0) {
                            hours = 12;
                        }

                        scope.selectedHourFull = parseInt(hours);
                        scope.selectedMinuteFull = parseFloat(hours) % 1 ? (parseFloat(hours) % 1) * 100 : 0;
                    };

                    scope.selectedHourDouble = function () {
                        var time = parseInt(scope.selectedHourFull);
                        if (time < 12 && scope.selectedAmPmFull == "pm") {
                            time = time + 12;
                        }

                        if (time == 12 && scope.selectedAmPmFull == "am") {
                            time = 0;
                        }

                        return parseFloat(time + "." + scope.selectedMinuteFull);
                    };

                    /******** User Save For Both *********/

                    var prepareSaveData = function (finalize) {
                        var saveData = {
                            selectedList: scope.selectedList.Id > 0 ? scope.selectedList.Id : scope.defaultListId,
                            selectedStores: scope.selectedStores(),
                            selectedGuestCodes: scope.selectedList.Id == 0 ? scope.selectedGuestCodes : null,
                            selectedSocialMediaAccountIds: scope.selectedSocialAccounts,
                            socialMediaMessage: scope.socialMediaMessage,
                            includePreviewInSocialMediaPost: scope.socialMediaIncludePreview,
                            selectedDate: scope.selectedDate,
                            selectedTime: scope.selectedHourDouble(),
                            sendNow: scope.sendNow === 'true',
                            finalize: !!finalize,
                            autoSave: false,

                            //local storage
                            recipientsCount: scope.recipientCount,
                            selectedSocialMediaAccountNickNames: getSelectedSocialAccountNickNames()
                        };
                        return saveData;
                    };

                    var userSave = function () { autoSave(false); };

                    var autoSave = function (isAutosave) {
                        var saveData = prepareSaveData(false);

                        if (!!isAutosave) {
                            saveData.autoSave = true;
                        }

                        messageService.schedule(saveData, function () {
                            editorEvents.successfulSave();
                        });
                    };

                    scope.schedule = function () {

                        var saveData = prepareSaveData(true);

                        messageService.schedule(
                            saveData,
                            function () {
                                editorEvents.successfulSave();
                                $location.url(configuration.steps[4].url);
                            },
                            function (errors) {
                                if (errors.indexOf("EXCEEDED") > -1) {
                                    var getTicks = function () {
                                        var sendDate = new Date(saveData.selectedDate);
                                        if (sendDate.getFullYear() < 2000) {
                                            sendDate = sendDate.setFullYear(sendDate.getFullYear() + 100);
                                        }
                                        var dateTicks = sendDate * 10000;
                                        var timeTicks = saveData.selectedTime * 3600 * 1000 * 10000;
                                        return dateTicks + timeTicks + 621355968000000000;
                                    }

                                    var queryStringParams = '?utc=1&sk=' + configuration.sessionKey + '&mc=' + scope.recipientCount + '&s=' + getTicks();

                                    if (errors.indexOf("ONTRACK") > -1) {
                                        scope.modalUrl = '/Billing/MailingOnTrackToExceed.aspx' + queryStringParams;
                                        scope.modalTitle = 'Projected Overage';
                                    }
                                    else {
                                        scope.modalUrl = '/Billing/MailingExceedsBalance.aspx' + queryStringParams;
                                        scope.modalTitle = 'Overage';
                                    }

                                    scope.showBillingModal = true;
                                }
                                else {
                                    scope.validationErrors = errors;
                                    scope.showValidationMessage = true;
                                }
                                editorEvents.successfulSave();
                            });
                    };
                    init();
                }
            ])
            .controller('ConfirmationCtrl', ['$scope',
                'messageService',
                '$location',
                function (scope, messageService, $location) {

                    scope.messageData = messageService.getScheduleData(function (data) {

                        // generate iframe url for message preview
                        scope.previewUrl = '/api/previews/' + data.id + '?sk=' + configuration.sessionKey + '&storeId=' + (data.stores.length ? data.stores[0].Id : 0) + '&mailFormat=2';

                        scope.stores = '';
                        scope.guestCodes = data.guestCodes && data.guestCodes.join(', ');
                        scope.socialMediaAccounts = '';

                        for (var i = 0; i < data.stores.length; i++) {
                            if (i === data.stores.length - 1) {
                                scope.stores += data.stores[i].Name;
                            }
                            else {
                                scope.stores += data.stores[i].Name + ', ';
                            }
                        }

                        if (data.socialMediaAccounts) {
                            for (var j = 0; j < data.socialMediaAccounts.length; j++) {
                                if (j === data.socialMediaAccounts.length - 1) {
                                    scope.socialMediaAccounts += data.socialMediaAccounts[j].NickName;
                                }
                                else {
                                    scope.socialMediaAccounts += data.socialMediaAccounts[j].NickName + ', ';
                                }
                            }
                        }
                    });

                    scope.copy = function () {
                        messageService.copy(function () {
                            $location.url(configuration.steps[2].url);
                        });
                    };

                    scope.cancelAndEdit = function () {
                        scope.showCancelModal = true;
                    };

                    scope.confirmationCallback = function () {
                        // hide modal
                        scope.showCancelModal = false;

                        // cancel the scheduling
                        messageService.cancel(function () {
                            $location.url(configuration.steps[2].url);
                        }, function (validationErrors) {
                            scope.showValidationMessage = true;
                            scope.validationErrors = validationErrors;
                        });
                    };
                }
            ]);
    }
);