define('services',
    ['angular', 'ngResource', 'configuration', 'amplifyStore', 'pace'],
    function (angular, ngResource, configuration, amplifyStore, pace) {
        'use strict';

        angular.module('editor.services', ['ngResource'])
            .factory('dataContext',
                ['$resource',
                    function (resource) {

                        var rs = resource('/api/:controller/:action', { sk: configuration.sessionKey }, {
                            getDesigns: { method: 'GET', params: { controller: 'designs', pageIndex: '@pageIndex', pageSize: '@pageSize', parentId: '@parentId', searchText: '@searchText' }, isArray: false },
                            getDesignFolders: { method: 'GET', params: { controller: 'designFolders', searchText: '@searchText', parentId: '@parentId' }, isArray: true },
                            addFavoriteDesign: { method: 'POST', params: { controller: 'favoriteDesigns', designId: '@designId' }, isArray: false, showAlert: true },
                            removeFavoriteDesign: { method: 'POST', params: { controller: 'favoriteDesigns', designId: '@designId' }, headers: { 'X-HTTP-Method-Override': 'DELETE' }, isArray: false, showAlert: true },
                            getLayouts: { method: 'GET', params: { controller: 'layouts' }, isArray: true },
                            getContentBlocks: { method: 'GET', params: { controller: 'contentblocks', action: 'GetByDesign', designId: '@designId' }, isArray: true },
                            addMessage: { method: 'POST', params: { controller: 'messages', performCopy: '@Copy', generatePreview: '@GeneratePreview' }, isArray: false, showAlert: true },
                            updateMessage: { method: 'POST', params: { controller: 'messages', id: '@Id', updateInEnterprise: '@UpdateInEnterprise', isScheduleData: '@Schedule' }, headers: { 'X-HTTP-Method-Override': 'PUT' }, isArray: false },
                            getMessage: { method: 'GET', params: { controller: 'messages', id: '@id', withDetails: '@withDetails' }, isArray: false },
                            getConfiguration: { method: 'GET', params: { controller: 'applications' }, isArray: false },
                            getStores: { method: 'GET', params: { controller: 'stores', listId: '@listId' }, isArray: true },
                            getGuestCodes: { method: 'GET', params: { controller: 'guestcodes' }, isArray: true },
                            sendPreview: { method: 'POST', params: { controller: 'previews' }, isArray: false },
                            getRecipientCount: { method: 'GET', params: { controller: 'recipients' }, isArray: false },
                            getLists: { method: 'GET', params: { controller: 'lists' }, isArray: true },
                            getPreviewMessage: { method: 'GET', params: { controller: 'previews', storeId: '@storeId', mailFormat: '@mailFormat' }, isArray: false },
                            getTimeZoneConfiguration: { method: 'GET', params: { controller: 'schedules' }, isArray: false },
                            getSocialMediaAccounts: { method: 'GET', params: { controller: 'socialMediaAccounts' }, isArray: true },
                            cancelMessage: { method: 'POST', params: { controller: 'messages', id: '@Id' }, headers: { 'X-HTTP-Method-Override': 'DELETE' }, isArray: false, showAlert: true }
                        });

                        var loadConfiguration = function () {
                            rs.getConfiguration(function (data) {
                                configuration.autoSaveFrecuency = data.AutoSaveFrecuency;
                                configuration.timeZone = data.TimeZone;
                                configuration.hasSocialMediaEnabled = data.HasSocialMediaEnabled;
                                configuration.defaultDesignId = data.DefaultDesignId;
                                // social media
                                configuration.twitterPostMaxLength = data.TwitterPostMaxLength;
                                configuration.twitterSocialMediaTypeId = data.TwitterSocialMediaTypeId;
                                configuration.facebookPostMaxLegnth = data.FacebookPostMaxLegnth;
                                configuration.facebookSocialMediaTypeId = data.FacebookSocialMediaTypeId;
                                configuration.foursquarePostMaxLength = data.FoursquarePostMaxLength;
                                configuration.foursquareSocialMediaTypeId = data.FoursquareSocialMediaTypeId;
                                configuration.socialMediaPreviewLength = data.SocialMediaPreviewLength;
                                configuration.isFullSupportedClient = data.IsFullSupportedClient;
                                configuration.autoSpellCheck = data.AutoSpellCheck;
                                configuration.couponCodeLabelText = data.CouponCodeLabelText;
                                configuration.defaultLayoutId = 1; // TODO: must be pulled from somewhere depending on requirement
                            });
                        };

                        loadConfiguration();

                        return {
                            getDesigns: rs.getDesigns,
                            getDesignFolders: rs.getDesignFolders,
                            addFavoriteDesign: rs.addFavoriteDesign,
                            removeFavoriteDesign: rs.removeFavoriteDesign,
                            getLayouts: rs.getLayouts,
                            getContentBlocks: rs.getContentBlocks,
                            addMessage: rs.addMessage,
                            updateMessage: rs.updateMessage,
                            getMessage: rs.getMessage,
                            getConfiguration: rs.getConfiguration,
                            getStores: rs.getStores,
                            getGuestCodes: rs.getGuestCodes,
                            sendPreview: rs.sendPreview,
                            getRecipientCount: rs.getRecipientCount,
                            getLists: rs.getLists,
                            getPreviewMessage: rs.getPreviewMessage,
                            getTimeZoneConfiguration: rs.getTimeZoneConfiguration,
                            scheduleMessage: rs.scheduleMessage,
                            sendError: rs.sendError,
                            getSocialMediaAccounts: rs.getSocialMediaAccounts,
                            cancelMessage: rs.cancelMessage
                        };
                    }
                ])
            .factory('messageService', [
                'dataContext',
                'editorEventsChannelService',
                '$rootScope',
                function (dc, editorEvents, scope) {

                    //private
                    var internalData = {
                        id: null,
                        name: null,
                        design: null,
                        layout: null,
                        from: null,
                        subject: null,
                        couponCode: null,
                        hasCoupon: null,
                        isDirty: false,
                        isFinalized: null
                    };

                    var scheduleData = {
                        // extended object
                        date: null,
                        time: null,
                        list: null,
                        guestCodes: null,
                        stores: null,
                        sendNow: false,
                        socialMediaAccounts: null,
                        socialMediaIncludePreview: null,
                        socialMediaMessage: null,
                        cancelAvailable: false,
                        recipientsCount: 0
                    };

                    //Designs
                    var getDesigns = function (pagingData, callback) {

                        var successCallback = function (data) {
                            if (angular.isFunction(callback)) {
                                callback(data);
                            }
                        };

                        return dc.getDesigns(pagingData, successCallback);
                    };

                    var getDesignFolders = function (data, callback) {
                        var successCallback = function (responseData) {
                            if (angular.isFunction(callback)) {
                                callback(responseData);
                            }
                        };

                        return dc.getDesignFolders(data, successCallback);
                    };

                    //Methods                                                  
                    var getHeader = function (callback) {
                        var result = angular.copy(internalData);

                        if (angular.isFunction(callback)) {
                            callback(result);
                        }

                        return result;
                    };

                    var getPreview = function (data, callback, errorCallback) {

                        var getPreviewData = {
                            id: internalData.id,
                            storeId: data.storeId,
                            mailFormat: data.mailFormat
                        };

                        dc.getPreviewMessage(getPreviewData, callback, errorCallback);
                    };

                    var setInternalData = function (messageBackendModel) {
                        //set the current Message Data
                        internalData.id = messageBackendModel.Id;
                        internalData.from = messageBackendModel.From;
                        internalData.subject = messageBackendModel.Subject;
                        internalData.name = messageBackendModel.Name;
                        internalData.design = messageBackendModel.DesignId;
                        internalData.layout = messageBackendModel.LayoutId;
                        internalData.couponCode = messageBackendModel.ReusableCouponCode;
                        internalData.hasCoupon = messageBackendModel.HasRedeemContentBlock;
                        internalData.isFinalized = messageBackendModel.IsFinalized;
                    };

                    var setScheduleData = function (backendModel) {

                        internalData.id = backendModel.Id;
                        internalData.from = backendModel.From;
                        internalData.subject = backendModel.Subject;
                        internalData.name = backendModel.Name;
                        internalData.design = backendModel.DesignId;
                        internalData.layout = backendModel.LayoutId;
                        internalData.couponCode = backendModel.ReusableCouponCode;
                        internalData.hasCoupon = backendModel.HasRedeemContentBlock;
                        internalData.isFinalized = backendModel.IsFinalized;

                        scheduleData.date = backendModel.Date;
                        scheduleData.time = backendModel.Time;
                        scheduleData.list = backendModel.List;
                        scheduleData.guestCodes = backendModel.GuestCodes;
                        scheduleData.stores = backendModel.Stores;
                        scheduleData.sendNow = backendModel.SendNow;
                        scheduleData.socialMediaAccounts = backendModel.SocialMediaAccounts;
                        scheduleData.includePreviewInSocialMediaPost = backendModel.IncludePreviewInSocialMediaPost;
                        scheduleData.socialMediaMessage = backendModel.SocialMediaMessage;
                        scheduleData.cancelAvailable = backendModel.CancelAvailable;

                        //confirmationData.recipientsCount = backendModel.RecipientsCount;
                    };

                    var setStep3UrlId = function (id) {
                        var editContentUrl = configuration.steps[2].url.split('/');
                        editContentUrl[editContentUrl.length - 1] = id;
                        configuration.steps[2].url = editContentUrl.join('/');
                    };

                    var create = function (options, callback) {

                        //create a wrapper of the callback to set internal context data (messageId)
                        var createCallback = function (data) {

                            setStep3UrlId(data.Id);

                            setInternalData(data);

                            //execute calback
                            callback(data);
                        };

                        var designId = internalData.design || configuration.defaultDesignId;
                        var layoutId = internalData.layout || configuration.defaultLayoutId;

                        dc.addMessage({
                            Name: internalData.name,
                            Id: options.copy ? internalData.id : 0,
                            DesignId: designId,
                            LayoutId: layoutId,
                            Copy: !!options.copy,
                            GeneratePreview: !!options.generatePreview
                        }, createCallback);
                    };

                    var update = function (entity, options, callback, errorCallback) {
                        var message = {
                            // regular update
                            Id: internalData.id,
                            Name: internalData.name,
                            From: internalData.from,
                            Subject: (entity.subject) ? entity.subject : internalData.subject,
                            DesignId: internalData.design,
                            LayoutId: internalData.layout,
                            EditableContent: entity.editableContent,

                            // schedule
                            SelectedList: entity.selectedList,
                            SelectedStores: entity.selectedStores,
                            SelectedGuestCodes: entity.selectedGuestCodes,
                            SelectedSocialMediaAccountIds: entity.selectedSocialMediaAccountIds,
                            SocialMediaMessage: entity.socialMediaMessage,
                            IncludePreviewInSocialMediaPost: entity.includePreviewInSocialMediaPost,
                            SelectedDate: entity.selectedDate,
                            SelectedTime: entity.selectedTime,
                            SendNow: !!entity.sendNow,
                            Finalize: !!entity.finalize,

                            // query string options
                            UpdateInEnterprise: !!options.updateInEnterprise,
                            Schedule: !!options.schedule
                        };

                        var updateCallback = function (responseData) {

                            setInternalData(responseData);

                            if (!options.isAutosave) {
                                pace.stop();
                                scope.showAlert = false;
                            }

                            internalData.isDirty = false;

                            if (options.updateInEnterprise || !!options.notifyEnterpriseSuccess) {
                                editorEvents.enterpriseSaveSuccess();
                            }

                            if (angular.isFunction(callback)) {
                                callback(responseData);
                            }
                        };

                        var updateErrorCallback = function (errorResponse) {
                            if (errorResponse.text.indexOf('FINALIZED') >= 0) {
                                scope.showFinalizedAlert = true;
                            }
                            
                            scope.showAlert = false;
                                
                            if (angular.isFunction(errorCallback)) {
                                errorCallback(errorResponse);
                            }
                        };

                        if (!options.isAutosave) {
                            pace.trackPost();
                            scope.showAlert = true;
                            scope.alertMessage = 'Saving';
                        }

                        if (options.forceSave || internalData.isDirty) {
                            dc.updateMessage(message, updateCallback, updateErrorCallback);
                        } else {

                            // callbacks for update are not taking response data as parameters
                            // update loading/saving indicator
                            if (!options.isAutosave) {
                                pace.stop();
                                scope.showAlert = false;
                            }

                            callback();
                        }
                    };

                    var schedule = function (data, callback, errorCallback) {

                        scheduleData.recipientsCount = data.recipientsCount;

                        var scheduleCallback = function (responseData) {

                            setScheduleData(responseData);

                            if (angular.isFunction(callback)) {
                                callback(responseData);
                            }
                        };

                        var scheduleErrorCallback = function (response) {
                            if (angular.isFunction(errorCallback)) {
                                errorCallback(response.text);
                            }
                        };

                        var updateOptions = {
                            forceSave: true,
                            schedule: true,
                            updateInEnterprise: true,
                            isAutosave: data.autoSave
                        };

                        update(data, updateOptions, scheduleCallback, scheduleErrorCallback);
                    };

                    var sendaTest = function (previewData, callback, errorCallBack) {

                        var sendATestData = {
                            messageId: internalData.id,
                            emailAddresses: previewData.emailAddresses && previewData.emailAddresses.split(','),
                            storeId: previewData.storeId
                        };

                        var sendCallback = function (data) {
                            if (callback) {
                                callback(data);
                            }
                        };

                        dc.sendPreview(sendATestData, sendCallback, errorCallBack);
                    };

                    var setHeader = function (data) {
                        if (data &&
                            (!!data.name ||
                                !!data.design ||
                                !!data.layout ||
                                !!data.from ||
                                !!data.subject)) {

                            internalData.name = data.name || internalData.name;
                            internalData.design = data.design || internalData.design;
                            internalData.layout = data.layout || internalData.layout;

                            internalData.from = data.from || internalData.from;
                            internalData.subject = data.subject || internalData.subject;

                            if (internalData.from && data.from // is a change on the from value
                                || internalData.subject && data.subject) { // is a change on the subject value
                                internalData.isDirty = true;
                            }

                        } else {
                            throw "messageService.setHeader(data) => data is invalid";
                        }
                    };

                    var getRecipientCount = function (data, callback, errorCallback) {
                        var recipientData = {
                            messageId: 0,
                            selectedList: data.selectedList,
                            selectedStores: data.selectedStores,
                            selectedGuestCodes: data.selectedGuestCodes
                        };

                        var updateCallback = function (returnData) {
                            if (callback) {
                                callback(returnData);
                            }
                        };

                        dc.getRecipientCount(recipientData, updateCallback, errorCallback);
                    };

                    var markAsDirty = function () {
                        internalData.isDirty = true;
                    };

                    var getMessage = function (data, callback) {

                        pace.trackPost();
                        scope.showAlert = true;
                        scope.alertMessage = 'Loading';

                        var requestData = {
                            id: internalData.id || data.id,
                            withDetails: data.withDetails || false
                        };

                        if (!requestData.id) {
                            throw "Invalid Message Id";
                        }

                        var success = function (responseData) {

                            // If message is already finalized, we should not let user work with it
                            if (responseData.IsFinalized) {
                                scope.showAlert = false;
                                scope.showFinalizedAlert = true;
                                return;
                            }

                            if (!internalData.id) {
                                // if the user comes from email admin pages (searchmails,editmails)
                                setStep3UrlId(responseData.Id);
                            }

                            setInternalData(responseData);

                            if (responseData.List) {
                                setScheduleData(responseData);
                            }

                            if (angular.isFunction(callback)) {
                                callback(responseData);
                            }

                            scope.showAlert = false;
                        };

                        return dc.getMessage(requestData, success);
                    };

                    var cancelMessage = function (callback, errorCallback) {
                        var cancelData = {
                            Id: internalData.id
                        };

                        var cancelCallback = function (responseData) {
                            if (angular.isFunction(callback)) {
                                callback(responseData);
                            }
                        };

                        var cancelErrorCallback = function (response) {
                            if (angular.isFunction(errorCallback)) {
                                errorCallback(response.text);
                            }
                        };

                        dc.cancelMessage(cancelData, cancelCallback, cancelErrorCallback);
                    };

                    var copy = function (callback) {
                        create({ copy: true }, callback);
                    };

                    var add = function (options, callback) {
                        create({ copy: false, generatePreview: !!options.generatePreview }, callback);
                    };

                    var getSocialMediaAccounts = function (callback) {

                        var callbackWrapper = function (data) {
                            if (angular.isFunction(callback)) {
                                callback(data);
                            }
                        };

                        return dc.getSocialMediaAccounts(callbackWrapper);
                    };

                    var getScheduleData = function (callback) {

                        var internalCopy = angular.copy(internalData);
                        var data = angular.extend(internalCopy, scheduleData);

                        if (angular.isFunction(callback)) {
                            callback(data);
                        }

                        return data;
                    };

                    var save = function (options, callback, errorCallback) {
                        if (internalData.id) {
                            // update

                            var requestOptions = {
                                updateInEnterprise: !!options.generatePreview,
                                schedule: false,
                                forceSave: !!options.forceSave
                            };

                            update({}, requestOptions, callback, errorCallback);
                        }
                        else {
                            // create
                            add(options, callback);
                        }
                    };

                    return {
                        getDesigns: getDesigns,
                        getDesignFolders: getDesignFolders,
                        addFavoriteDesign: dc.addFavoriteDesign,
                        removeFavoriteDesign: dc.removeFavoriteDesign,
                        getLayouts: dc.getLayouts,
                        getContentBlocks: dc.getContentBlocks,
                        getHeader: getHeader,
                        getStores: dc.getStores,
                        getGuestCodes: dc.getGuestCodes,
                        getLists: dc.getLists,
                        getPreview: getPreview,
                        getRecipientCount: getRecipientCount,
                        getSocialMediaAccounts: getSocialMediaAccounts,
                        get: getMessage,
                        add: add,
                        schedule: schedule,
                        sendaTest: sendaTest,
                        setHeader: setHeader,
                        markAsDirty: markAsDirty,
                        update: update,
                        save: save,
                        copy: copy,
                        cancel: cancelMessage,
                        getScheduleData: getScheduleData
                    };
                }
            ])
            .factory('userChangeService', ['dataContext',
                'messageService',
                function (dc, messageService) {

                    /****** OBJECT STRUCTURE ******
                    { 
                    MessageId: xxx,
                    CurrentIndex: 2,
                    History:[
                    {
                    Description: 'ContentBlock Inserted',
                    EditorInstanceId:'draggable01',
                    ContentBlockId:'cb_01',
                    CurrentValue:'<tr><td><span>Test Data</span></td></tr>',
                    PreviousValue:'<tr><td><span></span></td></tr>'
                    }
                    ]
                    }
                    ******************************/

                    /*********** PRIVATE METHODS ***************/
                    var getMessageBrowserCollection = function (messageId) {
                        return amplifyStore.store(configuration.storageEditorContentKey + messageId);
                    };

                    var saveMessageBrowserCollection = function (collection, messageId) {
                        //mark the message as dirty
                        messageService.markAsDirty();

                        amplifyStore.store(configuration.storageEditorContentKey + messageId, collection);
                    };

                    /********************************************/

                    var saveChanges = function (actionType, target, contentBlockId, previousValue, currentValue) {

                        // get current message data
                        var messageData = messageService.getHeader();

                        // default message collection data
                        var messageCollectionStructure = {
                            MessageId: messageData.id,
                            CurrentIndex: -1,
                            History: []
                        };

                        // modification to save
                        var actionDescriptor = { Description: actionType, EditorInstanceId: target, ContentBlockId: contentBlockId, PreviousValue: previousValue, CurrentValue: currentValue };

                        // get collection
                        var collection = getMessageBrowserCollection(messageData.id) || messageCollectionStructure;

                        // remove "redoable" (actions that are placed on the right of the current index) actions if some new change is made
                        if (collection.CurrentIndex < (collection.History.length - 1)) {
                            for (var i = collection.CurrentIndex; i < collection.History.length; i++) {
                                collection.History.pop();
                            }
                        }

                        // append to collection
                        collection.History.push(actionDescriptor);
                        collection.CurrentIndex = collection.History.length - 1;

                        // save
                        saveMessageBrowserCollection(collection, messageData.id);
                    };

                    var saveUndo = function () {

                        // get current message data
                        var messageData = messageService.getHeader();

                        var collection = getMessageBrowserCollection(messageData.id);

                        //prevent undesirable undo. defensive code, from ui when undo action its not enabled, clicking the button does not fire the action.
                        if (collection.CurrentIndex > -1) {

                            var actionDescriptor = collection.History[collection.CurrentIndex];

                            collection.CurrentIndex = collection.CurrentIndex - 1;

                            saveMessageBrowserCollection(collection, messageData.id);

                            return { action: actionDescriptor, historyLength: collection.History.length, remainingActions: collection.CurrentIndex + 1 };
                        }

                        return null;
                    };

                    var saveRedo = function () {

                        // get current message data
                        var messageData = messageService.getHeader();

                        var collection = getMessageBrowserCollection(messageData.id);

                        //prevent undesirable redo. defensive code, from ui when redo action its not enabled, clicking the button does not fire the action.
                        if ((collection.CurrentIndex + 1) < collection.History.length) {

                            collection.CurrentIndex = collection.CurrentIndex + 1;

                            var actionDescriptor = collection.History[collection.CurrentIndex];

                            saveMessageBrowserCollection(collection, messageData.id);

                            return { action: actionDescriptor, historyLength: collection.History.length, remainingActions: collection.History.length - (collection.CurrentIndex + 1) };
                        }
                        return null;
                    };

                    return {
                        saveChanges: saveChanges,
                        saveRedo: saveRedo,
                        saveUndo: saveUndo
                    };
                }
            ])
            .factory('editorEventsChannelService', ['$rootScope', '$timeout',
        // a channel service that lets consumers
        // subscribe and publish for events on the editor content
                function ($rootScope, timeout) {

                    //private properties
                    var timeoutId;

                    // local constants for the message ids.  
                    // these are private implementation detail
                    // ReSharper disable InconsistentNaming
                    var EDITOR_CONTENT_CHANGED = 'onEditorContentChanged';
                    var AUTO_SAVE_CONTENT = 'onEditorAutosave';
                    var USER_SAVE_CONTENT = 'onUserSaveContent';
                    var SUCCESSFULLY_SAVE = 'onSuccessfullySave';
                    var CONTEXTUAL_EDITOR_FOCUS = 'onContextualEditorFocus';
                    var CONTEXTUAL_EDITOR_BLUR = 'onContextualEditorBlur';
                    var ROUTE_CHANGED = '$locationChangeStart';
                    var ENTERPRISE_SAVE_SUCCESS = 'onEnterpriseSaveSuccess';
                    var PERFORM_UNDO_REDO = 'onPerformUndoRedo';
                    var CHANGE_SAVE_TEXT = 'onSaveButtonTextChanged';
                    var CHANGE_SAVE_ENABLE = 'onSaveButtonEnabledChanged';
                    var CHANGE_STEP_URL = 'onStepUrlChanged';
                    var CANVAS_SCROLL = 'onCanvasScroll';
                    // ReSharper restore InconsistentNaming

                    // publish that we have it a modification on the editor content
                    // note that the parameters are particular to the problem domain
                    var editorContentChanged = function (actionType, target, contenBlockId, oldValue, newValue) {

                        $rootScope.$broadcast(EDITOR_CONTENT_CHANGED,
                            {
                                actionType: actionType,
                                target: target,
                                contentBlockId: contenBlockId,
                                previousValue: oldValue,
                                currentValue: newValue
                            });
                    };

                    // subscribe to editorContentChanged event.
                    // note that you should require $scope first 
                    // so that when the subscriber is destroyed you 
                    // don't create a closure over it, and te scope can clean up. 
                    var onEditorContentChanged = function ($scope, handler) {
                        $scope.$on(EDITOR_CONTENT_CHANGED, function (event, message) {

                            // note that the handler is passed the problem domain parameters                            
                            handler(message.actionType, message.target, message.contentBlockId, message.previousValue, message.currentValue);
                        });
                    };

                    var autoSaveContentWithDelay = function () {
                        timeout(function () {
                            scheduleAutosave();
                            $rootScope.$broadcast(AUTO_SAVE_CONTENT, {});
                        }, 1000 * 30);
                    };

                    var autoSaveContent = function () {

                        scheduleAutosave();
                        $rootScope.$broadcast(AUTO_SAVE_CONTENT, {});
                    };

                    var scheduleAutosave = function () {
                        timeoutId = timeout(function () {
                            autoSaveContent();
                        }, configuration.autoSaveFrecuency);
                    };

                    var onAutoSaveContent = function ($scope, handler) {
                        $scope.$on(AUTO_SAVE_CONTENT, function (event, message) {
                            handler(message);
                        });
                    };

                    var userSaveContent = function () {
                        $rootScope.$broadcast(USER_SAVE_CONTENT, {});
                    };

                    var onUserSaveContent = function ($scope, handler) {
                        $scope.$on(USER_SAVE_CONTENT, function (event, message) {
                            handler(message);
                        });
                    };

                    var successfulSave = function () {
                        $rootScope.$broadcast(SUCCESSFULLY_SAVE, {});
                    };

                    var onSuccessfulSave = function ($scope, handler) {
                        $scope.$on(SUCCESSFULLY_SAVE, function (event, message) {
                            handler(message);
                        });
                    };

                    var stepUrlChanged = function (stepIndex, newUrl) {
                        $rootScope.$broadcast(CHANGE_STEP_URL, { Index: stepIndex, Url: newUrl });
                    };

                    var onStepUrlChanged = function ($scope, handler) {
                        $scope.$on(CHANGE_STEP_URL, function (event, message) {
                            handler(message);
                        });
                    };
                    /*
                    ****** CONTEXTUAL EDITOR EVENTS ******
                    */

                    var contextualEditorBlur = function (id) {
                        $rootScope.$broadcast(CONTEXTUAL_EDITOR_BLUR, { contentBlockId: id });
                    };
                    var onContextualEditorBlur = function ($scope, handler) {
                        $scope.$on(CONTEXTUAL_EDITOR_BLUR, function (event, message) {
                            handler(message);
                        });
                    };

                    var contextualEditorFocus = function (id) {
                        $rootScope.$broadcast(CONTEXTUAL_EDITOR_FOCUS, { contentBlockId: id });
                    };
                    var onContextualEditorFocus = function ($scope, handler) {
                        $scope.$on(CONTEXTUAL_EDITOR_FOCUS, function (event, message) {
                            handler(message);
                        });
                    };

                    var performUndoRedo = function (actionDescriptor, isUndo) {
                        $rootScope.$broadcast(PERFORM_UNDO_REDO, {
                            action: actionDescriptor,
                            isUndo: isUndo
                        });
                    };

                    var onPerformUndoRedo = function ($scope, handler) {
                        $scope.$on(PERFORM_UNDO_REDO, function (event, message) {
                            if ($scope.editorId == message.action.EditorInstanceId) {
                                handler(message.action, message.isUndo);
                            }
                        });
                    };

                    var canvasScrolling = function () {
                        $rootScope.$broadcast(CANVAS_SCROLL, {});
                    };
                    var onCanvasScrolling = function ($scope, handler) {
                        $scope.$on(CANVAS_SCROLL, function (event, message) {
                            handler(message);
                        });
                    };

                    /********** GLOBAL EVENTS **************/

                    var onRouteChanged = function ($scope, handler) {
                        $scope.$on(ROUTE_CHANGED, function (event, newRoute, oldRoute) {
                            handler(event, newRoute, oldRoute);
                        });
                    };

                    var enterpriseSaveSuccess = function () {
                        $rootScope.$broadcast(ENTERPRISE_SAVE_SUCCESS, {});
                    };

                    var onEnterpriseSaveSuccess = function ($scope, handler) {
                        $scope.$on(ENTERPRISE_SAVE_SUCCESS, function (event, message) {
                            handler(event, message);
                        });
                    };

                    var changeSaveText = function (saveButtonText) {
                        $rootScope.$broadcast(CHANGE_SAVE_TEXT, { buttonCaption: saveButtonText });
                    };

                    var onChangeSaveText = function ($scope, handler) {
                        $scope.$on(CHANGE_SAVE_TEXT, function (event, message) {
                            handler(event, message);
                        });
                    };

                    var changeSaveEnable = function (enabled) {
                        $rootScope.$broadcast(CHANGE_SAVE_ENABLE, { isEnabled: enabled });
                    };

                    var onChangeSaveEnable = function ($scope, handler) {
                        $scope.$on(CHANGE_SAVE_ENABLE, function (event, message) {
                            handler(event, message);
                        });
                    };

                    /*************************************/

                    return {
                        editorContentChanged: editorContentChanged,
                        onEditorContentChanged: onEditorContentChanged,
                        autoSaveContent: autoSaveContent,
                        onAutoSaveContent: onAutoSaveContent,
                        userSaveContent: userSaveContent,
                        onUserSaveContent: onUserSaveContent,
                        contextualEditorBlur: contextualEditorBlur,
                        onContextualEditorBlur: onContextualEditorBlur,
                        contextualEditorFocus: contextualEditorFocus,
                        onContextualEditorFocus: onContextualEditorFocus,
                        onRouteChanged: onRouteChanged,
                        enterpriseSaveSuccess: enterpriseSaveSuccess,
                        onEnterpriseSaveSuccess: onEnterpriseSaveSuccess,
                        performUndoRedo: performUndoRedo,
                        onPerformUndoRedo: onPerformUndoRedo,
                        changeSaveText: changeSaveText,
                        onChangeSaveText: onChangeSaveText,
                        successfulSave: successfulSave,
                        onSuccessfulSave: onSuccessfulSave,
                        changeSaveEnable: changeSaveEnable,
                        onChangeSaveEnable: onChangeSaveEnable,
                        autoSaveContentWithDelay: autoSaveContentWithDelay,
                        changeRouteUrl: stepUrlChanged,
                        onChangeRouteUrl: onStepUrlChanged,
                        canvasScrolling: canvasScrolling,
                        onCanvasScrolling: onCanvasScrolling
                    };
                }
            ])
            .factory('requestInterceptor', [
                '$q',
                '$rootScope',
                function ($q, scope) {

                    return {
                        // On request success
                        request: function (config) {

                            if (config.showAlert) {
                                pace.trackPost();
                                scope.showAlert = true;
                                scope.alertMessage = config.loadingMessage || 'Saving';
                            }
                            else if (!scope.showAlert) {
                                pace.restart();
                            }

                            // Return the config or wrap it in a promise if blank.
                            return config || $q.when(config);
                        },

                        // On request failure
                        requestError: function (rejection) {

                            // Return the promise rejection.
                            return $q.reject(rejection);
                        },

                        // On response success
                        response: function (response) {

                            if (scope.showAlert && response.config.showAlert || !scope.showAlert) {
                                pace.stop();
                                scope.showAlert = false;
                            }

                            // Return the response or promise.
                            return response || $q.when(response);
                        },

                        // On response failture
                        responseError: function (rejection) {

                            var promiseResponse = {};

                            // this cover the following case
                            // 1) start an alert loading
                            // 2) start another loading
                            // 3) end ajax loading -- does not fire stop, because the showAlert is true
                            // 4) end alert loading
                            if (scope.showAlert && rejection.config.showAlert || !scope.showAlert) {
                                pace.stop();
                                scope.showAlert = false;
                            }

                            switch (rejection.status) {
                                case 0:
                                case 401:
                                case 403:
                                    window.location.href = '/';
                                    promiseResponse = {
                                        status: 401,
                                        text: 'Unauthorized'
                                    };
                                    break;
                                case 500:
                                    window.location.href = errorPage;
                                    promiseResponse = {
                                        status: 500,
                                        text: 'Internal Server Error'
                                    };
                                    break;
                                default:
                                    var tmpErrors = rejection.data.ModelState;
                                    var errors = '';
                                    for (var key in tmpErrors) {

                                        errors += tmpErrors[key] + '\n';
                                    }

                                    promiseResponse = {
                                        status: rejection.status,
                                        text: errors
                                    };

                                    return $q.reject(promiseResponse);
                            }

                            // Return the promise rejection.
                            return $q.reject(rejection);
                        }
                    };
                } ]);
    }
);