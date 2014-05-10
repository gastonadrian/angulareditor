/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function (config) {
    // Define changes to default configuration here. For example:
    // config.uiColor = '#AADC6E';

    config.toolbar = [
        { name: 'basicstyles', items: ['Bold', 'Italic', 'Underline'] },
		{ name: 'lists', items: ['NumberedList', 'BulletedList'] },
        { name: 'aligns', items: ['Indent', 'Outdent', 'JustifyLeft', 'JustifyCenter', 'JustifyRight'] },
        '/',
    		{ name: 'fontstyle', items: ['Font', 'FontSize', 'TextColor'] },
            { name: 'clipboard', items: ['Cut', 'Copy', 'Paste'] },
            { name: 'editing', items:['SpellChecker', 'Scayt']},
            { name: 'links', items: ['Link', 'Unlink'] }
	];

    config.language = 'en';

    // Se the most common block elements.
    config.format_tags = 'p;h1;h2;h3;pre';

    config.font_names = 'Arial;Courier New;Garamond;Georgia;MS San Serif;Segoe UI;Tahoma;Times New Roman;Verdana';
    config.fontSize_sizes = '8/8px;9/9px;10/10px;11/11px;12/12px;13/13px;14/14px;16/16px;18/18px;20/20px;22/22px;24/24px;26/26px;28/28px;32/32px;36/36px;48/48px;72/72px;';
    config.skin = 'alphaeditor';

    config.linkShowAdvancedTab = false;
    config.linkShowTargetTab = false;
    // Make dialogs simpler.
    //config.removeDialogTabs = 'image:advanced;link:advanced';
};
