/*
Copyright (c) 2003-2011, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/

CKEDITOR.dialog.add('link', function (editor) {

    var entireMergeCodeRegex = /^##(.+)##$/,
        embeddedMergeCodeRegex = /##([^##]+)##/,
        protocolRegex = /^(http|https):\/\/{1}.*/i;

    var URLRegex = '';
    //URLRegex += "^((http|ftp|https|ftps)://{1}"; // required protocol
    URLRegex += "^(((http|ftp|https|ftps)://)?"; // optional protocol
    //URLRegex += "^("; // no protocol
    URLRegex += "(([0-9]{1,3}\.){3}[0-9]{1,3}"; // IP- 199.194.52.184
    URLRegex += "|"; // allows either IP or domain
    URLRegex += "([0-9a-z_!~*'()-]+\\.)*"; // tertiary domain(s)- www.
    URLRegex += "([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\\."; // second level domain
    URLRegex += "[a-z]{2,6})"; // first level domain- .com or .museum
    URLRegex += ")"; // one domain
    URLRegex += "(:[0-9]{1,4})?"; // port number- :80
    URLRegex += "((/?)|"; // a slash isn't required if there is no file name
    URLRegex += "(/[0-9a-z_!~*'().;?:@&=+$,%#-]+)+/?)$";

    var ValidEmailRegex = /^[^@]+@[^@]+.[a-z]{2,}$/i;

    var errorTextStyle = 'font-family: Arial, sans-serif; font-size: 12px; position: relative; color: #CB151D;';

    var plugin = CKEDITOR.plugins.link;
    // Handles the event when the "Target" selection box is changed.
    var targetChanged = function () {
        var dialog = this.getDialog(),
			popupFeatures = dialog.getContentElement('target', 'popupFeatures'),
			targetName = dialog.getContentElement('target', 'linkTargetName'),
			value = this.getValue();

        if (!popupFeatures || !targetName)
            return;

        popupFeatures = popupFeatures.getElement();
        popupFeatures.hide();
        targetName.setValue('');

        switch (value) {
            case 'frame':
                targetName.setLabel(editor.lang.link.targetFrameName);
                targetName.getElement().show();
                break;
            case 'popup':
                popupFeatures.show();
                targetName.setLabel(editor.lang.link.targetPopupName);
                targetName.getElement().show();
                break;
            default:
                targetName.setValue(value);
                targetName.getElement().hide();
                break;
        }

    };

    // Handles the event when the "Type" selection box is changed.
    // Displays the Email Subject field when email is selected
    var linkTypeChanged = function () {
        var dialog = this.getDialog(),
			typeValue = this.getValue();

        var element = dialog.getContentElement('info', 'emailOptions');
        element = element.getElement().getParent().getParent();
        if (typeValue == 'email')
            element.show();
        else
            element.hide();

        dialog.layout();
    };

    // Loads the parameters in a selected link to the link dialog fields.
    var javascriptProtocolRegex = /^javascript:/,
		emailRegex = /^mailto:([^?]+)(?:\?(.+))?$/,
		emailSubjectRegex = /subject=([^;?:@&=$,\/]*)/,
		emailBodyRegex = /body=([^;?:@&=$,\/]*)/,
		anchorRegex = /^#(.*)$/,
		urlRegex = /^((?:http|https|ftp|news):\/\/)?(.*)$/,
		selectableTargets = /^(_(?:self|top|parent|blank))$/,
		encodedEmailLinkRegex = /^javascript:void\(location\.href='mailto:'\+String\.fromCharCode\(([^)]+)\)(?:\+'(.*)')?\)$/,
		functionCallProtectedEmailLinkRegex = /^javascript:([^(]+)\(([^)]+)\)$/,
		mergeCodeRegex = /^##(.*)##$/;

    var popupRegex =
		/\s*window.open\(\s*this\.href\s*,\s*(?:'([^']*)'|null)\s*,\s*'([^']*)'\s*\)\s*;\s*return\s*false;*\s*/;
    var popupFeaturesRegex = /(?:^|,)([^=]+)=(\d+|yes|no)/gi;

    var parseLink = function (editor, element) {

        var href = (element && (element.data('cke-saved-href') || element.getAttribute('href'))) || '',
		 	javascriptMatch,
			emailMatch,
			anchorMatch,
			urlMatch,
			retval = {};

        // If there is no link yet, try to get the Link Text from the highlighted section
        if (!element) {
            retval.friendlyName = editor.getSelection().getSelectedText();
        }

        if ((javascriptMatch = href.match(javascriptProtocolRegex))) {
            if (emailProtection == 'encode') {
                href = href.replace(encodedEmailLinkRegex,
						function (match, protectedAddress, rest) {
						    return 'mailto:' +
							       String.fromCharCode.apply(String, protectedAddress.split(',')) +
							       (rest && unescapeSingleQuote(rest));
						});
            }
            // Protected email link as function call.
            else if (emailProtection) {
                href.replace(functionCallProtectedEmailLinkRegex, function (match, funcName, funcArgs) {
                    if (funcName == compiledProtectionFunction.name) {
                        retval.type = 'email';
                        var email = retval.email = {};

                        var paramRegex = /[^,\s]+/g,
							paramQuoteRegex = /(^')|('$)/g,
							paramsMatch = funcArgs.match(paramRegex),
							paramsMatchLength = paramsMatch.length,
							paramName,
							paramVal;

                        for (var i = 0; i < paramsMatchLength; i++) {
                            paramVal = decodeURIComponent(unescapeSingleQuote(paramsMatch[i].replace(paramQuoteRegex, '')));
                            paramName = compiledProtectionFunction.params[i].toLowerCase();
                            email[paramName] = paramVal;
                        }
                        email.address = [email.name, email.domain].join('@');
                    }
                });
            }
        }

        if (!retval.type) {
            if ((anchorMatch = href.match(anchorRegex)) && !href.match(mergeCodeRegex)) {
                retval.type = 'anchor';
                retval.anchor = {};
                retval.anchor.name = retval.anchor.id = anchorMatch[1];
            }
            // Protected email link as encoded string.
            else if ((emailMatch = href.match(emailRegex))) {
                var subjectMatch = href.match(emailSubjectRegex);

                retval.type = 'email';
                var email = (retval.email = {});
                email.address = emailMatch[1];
                subjectMatch && (email.subject = decodeURIComponent(subjectMatch[1]));
                ////bodyMatch && (email.body = decodeURIComponent(bodyMatch[1]));
            }
            // the url is a merge code
            else if (href.match(mergeCodeRegex)) {
                retval.type = 'url';
                retval.url = {};
                retval.url.protocol = '';
                retval.url.url = href;
            }
            // urlRegex matches empty strings, so need to check for href as well.
            else if (href && (urlMatch = href.match(urlRegex))) {
                retval.type = 'url';
                retval.url = {};
                retval.url.protocol = urlMatch[1];
                retval.url.url = urlMatch[1] + urlMatch[2];
            }
            else
                retval.type = 'url';
        }

        // Load target and popup settings.
        if (element) {
            // TODO: replace friendlyName with LinkText
            ////retval.friendlyName = decodeURIComponent(element.getAttribute('friendlyName'));
            ////retval.friendlyName == 'null' ? '' : retval.friendlyName
            retval.friendlyName = editor.getSelection().getSelectedText();

            var target = element.getAttribute('target');
            retval.target = {};
            retval.adv = {};

            // IE BUG: target attribute is an empty string instead of null in IE if it's not set.
            if (!target) {
                var onclick = element.data('cke-pa-onclick') || element.getAttribute('onclick'),
					onclickMatch = onclick && onclick.match(popupRegex);
                if (onclickMatch) {
                    retval.target.type = 'popup';
                    retval.target.name = onclickMatch[1];

                    var featureMatch;
                    while ((featureMatch = popupFeaturesRegex.exec(onclickMatch[2]))) {
                        // Some values should remain numbers (#7300)
                        if ((featureMatch[2] == 'yes' || featureMatch[2] == '1') && !(featureMatch[1] in { height: 1, width: 1, top: 1, left: 1 }))
                            retval.target[featureMatch[1]] = true;
                        else if (isFinite(featureMatch[2]))
                            retval.target[featureMatch[1]] = featureMatch[2];
                    }
                }
            }
            else {
                var targetMatch = target.match(selectableTargets);
                if (targetMatch)
                    retval.target.type = retval.target.name = target;
                else {
                    retval.target.type = 'frame';
                    retval.target.name = target;
                }
            }

            var me = this;
            var advAttr = function (inputName, attrName) {
                var value = element.getAttribute(attrName);
                if (value !== null)
                    retval.adv[inputName] = value || '';
            };
            advAttr('advId', 'id');
            advAttr('advLangDir', 'dir');
            advAttr('advAccessKey', 'accessKey');

            retval.adv.advName =
				element.data('cke-saved-name')
				|| element.getAttribute('name')
				|| '';
            advAttr('advLangCode', 'lang');
            advAttr('advTabIndex', 'tabindex');
            advAttr('advTitle', 'title');
            advAttr('advContentType', 'type');
            CKEDITOR.plugins.link.synAnchorSelector ?
				retval.adv.advCSSClasses = getLinkClass(element)
				: advAttr('advCSSClasses', 'class');
            advAttr('advCharset', 'charset');
            advAttr('advStyles', 'style');
            advAttr('advRel', 'rel');
        }

        // Find out whether we have any anchors in the editor.
        var anchors = retval.anchors = [],
			item;

        // For some browsers we set contenteditable="false" on anchors, making document.anchors not to include them, so we must traverse the links manually (#7893).
        if (CKEDITOR.plugins.link.emptyAnchorFix) {
            var links = editor.document.getElementsByTag('a');
            for (i = 0, count = links.count(); i < count; i++) {
                item = links.getItem(i);
                if (item.data('cke-saved-name') || item.hasAttribute('name'))
                    anchors.push({ name: item.data('cke-saved-name') || item.getAttribute('name'), id: item.getAttribute('id') });
            }
        }
        else {
            var anchorList = new CKEDITOR.dom.nodeList(editor.document.$.anchors);
            for (var i = 0, count = anchorList.count(); i < count; i++) {
                item = anchorList.getItem(i);
                anchors[i] = { name: item.getAttribute('name'), id: item.getAttribute('id') };
            }
        }

        if (CKEDITOR.plugins.link.fakeAnchor) {
            var imgs = editor.document.getElementsByTag('img');
            for (i = 0, count = imgs.count(); i < count; i++) {
                if ((item = CKEDITOR.plugins.link.tryRestoreFakeAnchor(editor, imgs.getItem(i))))
                    anchors.push({ name: item.getAttribute('name'), id: item.getAttribute('id') });
            }
        }

        // Record down the selected element in the dialog.
        this._.selectedElement = element;
        return retval;
    };

    var setupParams = function (page, data) {
        if (data[page])
            this.setValue(data[page][this.id] || '');
    };

    var setupPopupParams = function (data) {
        return setupParams.call(this, 'target', data);
    };

    var setupAdvParams = function (data) {
        return setupParams.call(this, 'adv', data);
    };

    var commitParams = function (page, data) {
        if (!data[page])
            data[page] = {};

        data[page][this.id] = this.getValue() || '';
    };

    var commitPopupParams = function (data) {
        return commitParams.call(this, 'target', data);
    };

    var commitAdvParams = function (data) {
        return commitParams.call(this, 'adv', data);
    };

    function unescapeSingleQuote(str) {
        return str.replace(/\\'/g, '\'');
    }

    function escapeSingleQuote(str) {
        return str.replace(/'/g, '\\$&');
    }

    var emailProtection = editor.config.emailProtection || '';

    // Compile the protection function pattern.
    if (emailProtection && emailProtection != 'encode') {
        var compiledProtectionFunction = {};

        emailProtection.replace(/^([^(]+)\(([^)]+)\)$/, function (match, funcName, params) {
            compiledProtectionFunction.name = funcName;
            compiledProtectionFunction.params = [];
            params.replace(/[^,\s]+/g, function (param) {
                compiledProtectionFunction.params.push(param);
            });
        });
    }

    function protectEmailLinkAsFunction(email) {
        var retval,
			name = compiledProtectionFunction.name,
			params = compiledProtectionFunction.params,
			paramName,
			paramValue;

        retval = [name, '('];
        for (var i = 0; i < params.length; i++) {
            paramName = params[i].toLowerCase();
            paramValue = email[paramName];

            i > 0 && retval.push(',');
            retval.push('\'',
						 paramValue ?
						 escapeSingleQuote(encodeURIComponent(email[paramName]))
						 : '',
						 '\'');
        }
        retval.push(')');
        return retval.join('');
    }

    function protectEmailAddressAsEncodedString(address) {
        var charCode,
			length = address.length,
			encodedChars = [];
        for (var i = 0; i < length; i++) {
            charCode = address.charCodeAt(i);
            encodedChars.push(charCode);
        }
        return 'String.fromCharCode(' + encodedChars.join(',') + ')';
    }

    function getLinkClass(ele) {
        var className = ele.getAttribute('class');
        return className ? className.replace(/\s*(?:cke_anchor_empty|cke_anchor)(?:\s*$)?/g, '') : '';
    }

    function trim(value) {
        value = value || '';

        value = value.replace(/^\s+/, '');
        value = value.replace(/\s+$/, '');

        return value;
    }

    var commonLang = editor.lang.common,
		linkLang = editor.lang.link;

    return {
        title: linkLang.title,
        minWidth: 350,
        minHeight: 230,
        contents: [
			{
			    id: 'info',
			    label: linkLang.info,
			    title: linkLang.info,
			    elements:
				[
					{
					    type: 'hbox',
					    id: 'hboxErrors',
					    padding: 0,
					    children:
                        [
                            {
                                type: 'html',
                                id: 'txtErrors',
                                style: errorTextStyle,
                                html: ''
                            }
                        ]
					},
					{
					    type: 'vbox',
					    id: 'urlOptions',
					    children:
						[
							{
							    type: 'hbox',
							    widths: ['25%', '75%'],
							    children:
								[
									{
									    id: 'linkType',
									    type: 'select',
									    label: linkLang.labelType,
									    'default': 'url',
									    items:
						                [
							                [linkLang.toUrl, 'url'],
							                [linkLang.toEmail, 'email']
						                ],
									    onChange: linkTypeChanged,
									    setup: function (data) {
									        if (data.type)
									            this.setValue(data.type);
									    },
									    commit: function (data) {
									        data.type = this.getValue();
									    }
									},
									{
									    type: 'text',
									    id: 'url',
									    label: linkLang.labelAddress,
									    required: true,
									    onLoad: function () {
									        this.allowOnChange = true;
									    },
									    validate: function () {
									        var dialog = this.getDialog();

									        if (this.getDialog().fakeObj) {	// Edit Anchor.
									            return true;
									        }

									        // We will perform link text validation here so that the error message can be displayed all at once
									        var linkText = dialog.getValueOf('info', 'friendlyName');
									        var linkTextErrorMessage = linkText.length == 0 ? '<br />' + linkLang.noLinkText : '';

									        var address = trim(this.getValue());
									        if (address.length == 0) {
									            dialog.getContentElement('info', 'txtErrors').getElement().setHtml(linkLang.noUrl + linkTextErrorMessage);
									            dialog.getContentElement('info', 'hboxErrors').getElement().show();
									            return false;
									        }

									        var regex;
									        if (dialog.getValueOf('info', 'linkType') == 'url') {
									            regex = new RegExp(URLRegex, 'i');

									            // cannot test regular expression on very long string because it may crash the browser
									            // we will ignore the query string variables when validating
									            var questionMarkAt = address.indexOf('?');
									            if (questionMarkAt > -1) {
									                address = address.substring(0, questionMarkAt);
									            }
									        }
									        else {
									            regex = new RegExp(ValidEmailRegex);
									        }

									        if (!regex.test(address)) {
									            dialog.getContentElement('info', 'txtErrors').getElement().setHtml(linkLang.invalidAddress + linkTextErrorMessage);
									            dialog.getContentElement('info', 'hboxErrors').getElement().show();
									            return false;
									        }

									        return true;
									    },
									    setup: function (data) {
									        this.allowOnChange = false;

									        if (data.url)
									            this.setValue(data.url.url);
									        else if (data.email && data.email.address)
									            this.setValue(data.email.address);
									        this.allowOnChange = true;

									    },
									    commit: function (data) {
									        var dialog = this.getDialog();
									        var linkType = dialog.getValueOf('info', 'linkType');

									        if (linkType == 'url') {
									            if (!data.url)
									                data.url = {};

									            // Protocol is optional, so we need to add it on commit if it is not provided
									            var url = this.getValue();
									            if (url.substring(0, 4).toLowerCase() != "http") {
									                url = "http://" + url;
									            }
									            data.url.url = url;
									        }
									        else {
									            if (!data.email)
									                data.email = {};

									            data.email.address = this.getValue();
									        }

									        this.allowOnChange = false;
									    }
									}
								],


							    setup: function (data) {
							        if (!this.getDialog().getContentElement('info', 'linkType'))
							            this.getElement().show();
							    }
							},
                            {
                                type: 'vbox',
                                id: 'friendlyNameBox',
                                padding: 1,
                                children:
							    [
								    {
								        type: 'text',
								        id: 'friendlyName',
								        label: linkLang.labelLinkText,
								        setup: function (data) {
								            if (data.friendlyName)
								                this.setValue(data.friendlyName == 'null' ? '' : data.friendlyName);
								        },
								        commit: function (data) {
								            if (!data.friendlyName)
								                data.friendlyName = this.getValue();
								        }
								    }
							    ]
                            }
						]
					},

					{
					    type: 'vbox',
					    id: 'emailOptions',
					    padding: 1,
					    children:
						[
							{
							    type: 'text',
							    id: 'emailSubject',
							    label: linkLang.emailSubject,
							    setup: function (data) {
							        if (data.email)
							            this.setValue(data.email.subject);
							    },
							    commit: function (data) {
							        if (!data.email)
							            data.email = {};

							        data.email.subject = this.getValue();
							    }
							}
						],
					    setup: function (data) {
					        if (!this.getDialog().getContentElement('info', 'linkType'))
					            this.getElement().hide();
					    }
					}
				]
			},
			{
			    id: 'target',
			    label: linkLang.target,
			    title: linkLang.target,
			    elements:
				[
					{
					    type: 'hbox',
					    widths: ['50%', '50%'],
					    children:
						[
							{
							    type: 'select',
							    id: 'linkTargetType',
							    label: commonLang.target,
							    'default': 'notSet',
							    style: 'width : 100%;',
							    'items':
								[
									[commonLang.notSet, 'notSet'],
									[linkLang.targetFrame, 'frame'],
									[linkLang.targetPopup, 'popup'],
									[commonLang.targetNew, '_blank'],
									[commonLang.targetTop, '_top'],
									[commonLang.targetSelf, '_self'],
									[commonLang.targetParent, '_parent']
								],
							    onChange: targetChanged,
							    setup: function (data) {
							        if (data.target)
							            this.setValue(data.target.type || 'notSet');
							        targetChanged.call(this);
							    },
							    commit: function (data) {
							        if (!data.target)
							            data.target = {};

							        data.target.type = this.getValue();
							    }
							},
							{
							    type: 'text',
							    id: 'linkTargetName',
							    label: linkLang.targetFrameName,
							    'default': '',
							    setup: function (data) {
							        if (data.target)
							            this.setValue(data.target.name);
							    },
							    commit: function (data) {
							        if (!data.target)
							            data.target = {};

							        data.target.name = this.getValue().replace(/\W/gi, '');
							    }
							}
						]
					},
					{
					    type: 'vbox',
					    width: '100%',
					    align: 'center',
					    padding: 2,
					    id: 'popupFeatures',
					    children:
						[
							{
							    type: 'fieldset',
							    label: linkLang.popupFeatures,
							    children:
								[
									{
									    type: 'hbox',
									    children:
										[
											{
											    type: 'checkbox',
											    id: 'resizable',
											    label: linkLang.popupResizable,
											    setup: setupPopupParams,
											    commit: commitPopupParams
											},
											{
											    type: 'checkbox',
											    id: 'status',
											    label: linkLang.popupStatusBar,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											}
										]
									},
									{
									    type: 'hbox',
									    children:
										[
											{
											    type: 'checkbox',
											    id: 'location',
											    label: linkLang.popupLocationBar,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											},
											{
											    type: 'checkbox',
											    id: 'toolbar',
											    label: linkLang.popupToolbar,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											}
										]
									},
									{
									    type: 'hbox',
									    children:
										[
											{
											    type: 'checkbox',
											    id: 'menubar',
											    label: linkLang.popupMenuBar,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											},
											{
											    type: 'checkbox',
											    id: 'fullscreen',
											    label: linkLang.popupFullScreen,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											}
										]
									},
									{
									    type: 'hbox',
									    children:
										[
											{
											    type: 'checkbox',
											    id: 'scrollbars',
											    label: linkLang.popupScrollBars,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											},
											{
											    type: 'checkbox',
											    id: 'dependent',
											    label: linkLang.popupDependent,
											    setup: setupPopupParams,
											    commit: commitPopupParams

											}
										]
									},
									{
									    type: 'hbox',
									    children:
										[
											{
											    type: 'text',
											    widths: ['50%', '50%'],
											    labelLayout: 'horizontal',
											    label: commonLang.width,
											    id: 'width',
											    setup: setupPopupParams,
											    commit: commitPopupParams

											},
											{
											    type: 'text',
											    labelLayout: 'horizontal',
											    widths: ['50%', '50%'],
											    label: linkLang.popupLeft,
											    id: 'left',
											    setup: setupPopupParams,
											    commit: commitPopupParams

											}
										]
									},
									{
									    type: 'hbox',
									    children:
										[
											{
											    type: 'text',
											    labelLayout: 'horizontal',
											    widths: ['50%', '50%'],
											    label: commonLang.height,
											    id: 'height',
											    setup: setupPopupParams,
											    commit: commitPopupParams

											},
											{
											    type: 'text',
											    labelLayout: 'horizontal',
											    label: linkLang.popupTop,
											    widths: ['50%', '50%'],
											    id: 'top',
											    setup: setupPopupParams,
											    commit: commitPopupParams

											}
										]
									}
								]
							}
						]
					}
				]
			},
			{
			    id: 'upload',
			    label: linkLang.upload,
			    title: linkLang.upload,
			    hidden: true,
			    filebrowser: 'uploadButton',
			    elements:
				[
					{
					    type: 'file',
					    id: 'upload',
					    label: commonLang.upload,
					    style: 'height:40px',
					    size: 29
					},
					{
					    type: 'fileButton',
					    id: 'uploadButton',
					    label: commonLang.uploadSubmit,
					    filebrowser: 'info:url',
					    'for': ['upload', 'upload']
					}
				]
			},
			{
			    id: 'advanced',
			    label: linkLang.advanced,
			    title: linkLang.advanced,
			    elements:
				[
					{
					    type: 'vbox',
					    padding: 1,
					    children:
						[
							{
							    type: 'hbox',
							    widths: ['45%', '35%', '20%'],
							    children:
								[
									{
									    type: 'text',
									    id: 'advId',
									    label: linkLang.id,
									    setup: setupAdvParams,
									    commit: commitAdvParams
									},
									{
									    type: 'select',
									    id: 'advLangDir',
									    label: linkLang.langDir,
									    'default': '',
									    style: 'width:110px',
									    items:
										[
											[commonLang.notSet, ''],
											[linkLang.langDirLTR, 'ltr'],
											[linkLang.langDirRTL, 'rtl']
										],
									    setup: setupAdvParams,
									    commit: commitAdvParams
									},
									{
									    type: 'text',
									    id: 'advAccessKey',
									    width: '80px',
									    label: linkLang.acccessKey,
									    maxLength: 1,
									    setup: setupAdvParams,
									    commit: commitAdvParams

									}
								]
							},
							{
							    type: 'hbox',
							    widths: ['45%', '35%', '20%'],
							    children:
								[
									{
									    type: 'text',
									    label: linkLang.name,
									    id: 'advName',
									    setup: setupAdvParams,
									    commit: commitAdvParams

									},
									{
									    type: 'text',
									    label: linkLang.langCode,
									    id: 'advLangCode',
									    width: '110px',
									    'default': '',
									    setup: setupAdvParams,
									    commit: commitAdvParams

									},
									{
									    type: 'text',
									    label: linkLang.tabIndex,
									    id: 'advTabIndex',
									    width: '80px',
									    maxLength: 5,
									    setup: setupAdvParams,
									    commit: commitAdvParams

									}
								]
							}
						]
					},
					{
					    type: 'vbox',
					    padding: 1,
					    children:
						[
							{
							    type: 'hbox',
							    widths: ['45%', '55%'],
							    children:
								[
									{
									    type: 'text',
									    label: linkLang.advisoryTitle,
									    'default': '',
									    id: 'advTitle',
									    setup: setupAdvParams,
									    commit: commitAdvParams

									},
									{
									    type: 'text',
									    label: linkLang.advisoryContentType,
									    'default': '',
									    id: 'advContentType',
									    setup: setupAdvParams,
									    commit: commitAdvParams

									}
								]
							},
							{
							    type: 'hbox',
							    widths: ['45%', '55%'],
							    children:
								[
									{
									    type: 'text',
									    label: linkLang.cssClasses,
									    'default': '',
									    id: 'advCSSClasses',
									    setup: setupAdvParams,
									    commit: commitAdvParams

									},
									{
									    type: 'text',
									    label: linkLang.charset,
									    'default': '',
									    id: 'advCharset',
									    setup: setupAdvParams,
									    commit: commitAdvParams

									}
								]
							},
							{
							    type: 'hbox',
							    widths: ['45%', '55%'],
							    children:
								[
									{
									    type: 'text',
									    label: linkLang.rel,
									    'default': '',
									    id: 'advRel',
									    setup: setupAdvParams,
									    commit: commitAdvParams
									},
									{
									    type: 'text',
									    label: linkLang.styles,
									    'default': '',
									    id: 'advStyles',
									    validate: CKEDITOR.dialog.validate.inlineStyle(editor.lang.common.invalidInlineStyle),
									    setup: setupAdvParams,
									    commit: commitAdvParams
									}
								]
							}
						]
					}
				]
			}
		],
        onShow: function () {
            var editor = this.getParentEditor(),
				        selection = editor.getSelection(),
				        element = null;

            // hide errors panel
            this.getContentElement('info', 'hboxErrors').getElement().hide();
            this.getContentElement('info', 'txtErrors').html = '';

            // Fill in all the relevant fields if there's already one link selected.
            if ((element = plugin.getSelectedLink(editor)) && element.hasAttribute('href'))
                selection.selectElement(element);
            else
                element = null;

            this.setupContent(parseLink.apply(this, [editor, element]));
        },
        onOk: function () {
            var attributes = {},
				removeAttributes = [],
				data = {},
				me = this,
				editor = this.getParentEditor();

            this.commitContent(data);

            // Compose the URL.
            switch (data.type || 'url') {
                case 'url':
                    var protocol = (data.url && data.url.protocol != undefined) ? data.url.protocol : 'http://',
						url = (data.url && CKEDITOR.tools.trim(data.url.url)) || '';
                    url = url.replace(/"/g, "'");

                    attributes['data-cke-saved-href'] = url; //// (url.indexOf('/') === 0 || url.match(mergeCodeRegex)) ? url : protocol + url;

                    break;
                case 'anchor':
                    var name = (data.anchor && data.anchor.name),
						id = (data.anchor && data.anchor.id);
                    attributes['data-cke-saved-href'] = '#' + (name || id || '');
                    break;
                case 'email':

                    var linkHref,
						email = data.email,
						address = email.address;

                    switch (emailProtection) {
                        case '':
                        case 'encode':
                            {
                                var subject = encodeURIComponent(email.subject || '');

                                // Build the e-mail parameters first.
                                var argList = [];
                                subject && argList.push('subject=' + subject);
                                ////body && argList.push('body=' + body);
                                argList = argList.length ? '?' + argList.join('&') : '';

                                if (emailProtection == 'encode') {
                                    linkHref = ['javascript:void(location.href=\'mailto:\'+',
											 protectEmailAddressAsEncodedString(address)];
                                    // parameters are optional.
                                    argList && linkHref.push('+\'', escapeSingleQuote(argList), '\'');

                                    linkHref.push(')');
                                }
                                else
                                    linkHref = ['mailto:', address, argList];

                                break;
                            }
                        default:
                            {
                                // Separating name and domain.
                                var nameAndDomain = address.split('@', 2);
                                email.name = nameAndDomain[0];
                                email.domain = nameAndDomain[1];

                                linkHref = ['javascript:', protectEmailLinkAsFunction(email)];
                            }
                    }

                    attributes['data-cke-saved-href'] = linkHref.join('');
                    break;
            }

            // Popups and target.
            if (data.target) {
                if (data.target.type == 'popup') {
                    var onclickList = ['window.open(this.href, \'',
							data.target.name || '', '\', \''];
                    var featureList = ['resizable', 'status', 'location', 'toolbar', 'menubar', 'fullscreen',
							'scrollbars', 'dependent'];
                    var featureLength = featureList.length;
                    var addFeature = function (featureName) {
                        if (data.target[featureName])
                            featureList.push(featureName + '=' + data.target[featureName]);
                    };

                    for (var i = 0; i < featureLength; i++)
                        featureList[i] = featureList[i] + (data.target[featureList[i]] ? '=yes' : '=no');
                    addFeature('width');
                    addFeature('left');
                    addFeature('height');
                    addFeature('top');

                    onclickList.push(featureList.join(','), '\'); return false;');
                    attributes['data-cke-pa-onclick'] = onclickList.join('');

                    // Add the "target" attribute. (#5074)
                    removeAttributes.push('target');
                }
                else {
                    if (data.target.type != 'notSet' && data.target.name)
                        attributes.target = data.target.name;
                    else
                        removeAttributes.push('target');

                    removeAttributes.push('data-cke-pa-onclick', 'onclick');
                }
            }

            // Advanced attributes.
            if (data.adv) {
                var advAttr = function (inputName, attrName) {
                    var value = data.adv[inputName];
                    if (value)
                        attributes[attrName] = value;
                    else
                        removeAttributes.push(attrName);
                };

                advAttr('advId', 'id');
                advAttr('advLangDir', 'dir');
                advAttr('advAccessKey', 'accessKey');

                if (data.adv['advName'])
                    attributes['name'] = attributes['data-cke-saved-name'] = data.adv['advName'];
                else
                    removeAttributes = removeAttributes.concat(['data-cke-saved-name', 'name']);

                advAttr('advLangCode', 'lang');
                advAttr('advTabIndex', 'tabindex');
                advAttr('advTitle', 'title');
                advAttr('advContentType', 'type');
                advAttr('advCSSClasses', 'class');
                advAttr('advCharset', 'charset');
                advAttr('advStyles', 'style');
                advAttr('advRel', 'rel');
            }

            var selection = editor.getSelection();
            // Browser need the "href" for copy/paste link to work. (#6641)
            attributes.href = attributes['data-cke-saved-href'];

            if (!this._.selectedElement) {
                var range = selection.getRanges()[0];

                // Use link URL as text with a collapsed cursor.
                if (range.collapsed) {
                    // Short mailto link text view (#5736).
                    //var text = new CKEDITOR.dom.text(data.type == 'email' ? data.email.address : attributes['data-cke-saved-href'], editor.document);
                    var linkText = data.friendlyName; // TODO: Cannot be empty
                    var text = new CKEDITOR.dom.text(linkText, editor.document);
                    range.insertNode(text);
                    range.selectNodeContents(text);
                }

                // Apply style.
                var style = new CKEDITOR.style({ element: 'a', attributes: attributes });
                style.type = CKEDITOR.STYLE_INLINE; // need to override... dunno why.
                style.applyToRange(range);
                range.select();
            }
            else {
                // We're only editing an existing link, so just overwrite the attributes.
                var element = this._.selectedElement,
					href = element.data('cke-saved-href'),
					textView = data.friendlyName ? data.friendlyName : element.getHtml();

                element.setAttributes(attributes);
                element.removeAttributes(removeAttributes);

                if (data.adv && data.adv.advName && CKEDITOR.plugins.link.synAnchorSelector)
                    element.addClass(element.getChildCount() ? 'cke_anchor' : 'cke_anchor_empty');

                // Update text view when user changes protocol (#4612).
                ////if (href == textView || data.type == 'email' && textView.indexOf('@') != -1) {
                // Short mailto link text view (#5736).
                element.setHtml(textView);

                ////}

                delete this._.selectedElement;
            }
        },
        onLoad: function () {
            if (!editor.config.linkShowAdvancedTab)
                this.hidePage('advanced'); 	//Hide Advanded tab.

            if (!editor.config.linkShowTargetTab)
                this.hidePage('target'); 	//Hide Target tab.

        },
        // Inital focus on 'url' field if link is of type URL.
        onFocus: function () {
            var linkType = this.getContentElement('info', 'linkType'),
					urlField;
            if (linkType && linkType.getValue() == 'url') {
                urlField = this.getContentElement('info', 'url');
                urlField.select();
            }
        }
    };
});

/**
* The e-mail address anti-spam protection option. The protection will be
* applied when creating or modifying e-mail links through the editor interface.<br>
* Two methods of protection can be choosed:
* <ol>	<li>The e-mail parts (name, domain and any other query string) are
*			assembled into a function call pattern. Such function must be
*			provided by the developer in the pages that will use the contents.
*		<li>Only the e-mail address is obfuscated into a special string that
*			has no meaning for humans or spam bots, but which is properly
*			rendered and accepted by the browser.</li></ol>
* Both approaches require JavaScript to be enabled.
* @name CKEDITOR.config.emailProtection
* @since 3.1
* @type String
* @default '' (empty string = disabled)
* @example
* // href="mailto:tester@ckeditor.com?subject=subject&body=body"
* config.emailProtection = '';
* @example
* // href="<a href=\"javascript:void(location.href=\'mailto:\'+String.fromCharCode(116,101,115,116,101,114,64,99,107,101,100,105,116,111,114,46,99,111,109)+\'?subject=subject&body=body\')\">e-mail</a>"
* config.emailProtection = 'encode';
* @example
* // href="javascript:mt('tester','ckeditor.com','subject','body')"
* config.emailProtection = 'mt(NAME,DOMAIN,SUBJECT,BODY)';
*/
