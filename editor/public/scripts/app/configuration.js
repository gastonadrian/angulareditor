define('configuration',
    [], function () {
        'use strict';

       var steps = [
            { url: '/selectdesign/:designId?', description: 'Select Design', templateUrl: '/partials/selectDesign.html', controller: 'SelectDesignCtrl', display: true },
            { url: '/selectlayout', description: 'Select Layout', templateUrl: '/partials/selectLayout.html', controller: 'SelectLayoutCtrl', display: true },
            { url: '/editcontent/:messageId?', description: 'Edit Content', templateUrl: '/partials/editor.html', controller: 'EditContentCtrl', display: true },
            { url: '/members', description: 'Schedule & Send', templateUrl: '/partials/members.html', controller: 'SelectMembersCtrl', display: true },
            { url: '/confirmation', description: '', templateUrl: '/partials/confirmation.html', controller: 'ConfirmationCtrl', display: false }
            ];

        var sessionKey = window.sessionKey;
        var hasSocialMedia = false;
        var timeZone,
            twitterPostMaxLength,
            twitterSocialMediaTypeId,
            facebookPostMaxLegnth,
            facebookSocialMediaTypeId,
            foursquarePostMaxLength,
            foursquareSocialMediaTypeId,
            socialMediaPreviewLength,
            isFullSupportedClient,
            autoSpellCheck,
            couponCodeLabelText;

        var editors = {
            TextOnlyEditor: 'text',
            ImageEditor: 'image'
        };

        var contentBlockEvents = {
            Reordered: 'Content Blocks Reordered',
            Deleted: 'Content Block Deleted',
            Created: 'Content Block Created'
        };

        return {
            canvasClass: 'layoutTable',
            droppableContentBlockClass: 'droppableContentBlock',
            contentBlockClass: 'editorContentBlock',
            editorHtmlContainerId: 'editorCanvas',
            overlayClass: 'ui-widget-overlay',
            imageEditorModal: 'imageEditorModal',
            overlayMenuBarClass: 'contentBlockHoverMenuBar',
            contentBlockDefaultValue: 'editor-default-value',
            contentBlockEvents: contentBlockEvents,
            defaultValueText: '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aliquam, magni natus voluptas vero sit nesciunt consequatur eveniet iure tempora ex! Quas iure mollitia aut aspernatur. Voluptas non harum reiciendis vel? Lorem ipsum dolor sit amet, consectetur adipisicing elit. Adipisci, nobis, at, accusamus cumque sit laboriosam non voluptatibus totam iste fugit earum harum nam voluptates officiis et laudantium rem dolorem minus!</p>',
            steps: steps,
            sessionKey: sessionKey,
            // ReSharper disable UsageOfPossiblyUnassignedValue
            timeZone: timeZone,
            // ReSharper restore UsageOfPossiblyUnassignedValue
            editorDefinitions: editors,
            onEditorContentChangeMessage: 'OnEditorContentChange',
            storageEditorContentKey: 'EditorContent',
            autoSaveFrecuency: 180000,
            hasSocialMediaEnabled: hasSocialMedia,
            twitterPostMaxLength: twitterPostMaxLength,
            twitterSocialMediaTypeId: twitterSocialMediaTypeId,

            facebookPostMaxLegnth: facebookPostMaxLegnth,
            facebookSocialMediaTypeId: facebookSocialMediaTypeId,

            foursquarePostMaxLength: foursquarePostMaxLength,
            foursquareSocialMediaTypeId: foursquareSocialMediaTypeId,
            socialMediaPreviewLength: socialMediaPreviewLength,
            isFullSupportedClient: isFullSupportedClient,
            autoSpellCheck: autoSpellCheck,
            couponCodeLabelText: couponCodeLabelText,
            debug: false
        };
    });