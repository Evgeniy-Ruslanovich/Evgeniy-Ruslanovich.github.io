(function () {
    var MODAL_CONTAINER_ID = 'ep-modal-container';
    var MODAL_BODY_ID = 'ep-modal-body';
    var BTN_CLOSE_ID = 'ep-modal-close';
    var BTN_EXTERNAL_SUBMIT = 'ep-run-transaction';
    var BASE_PATH = '/payment';

    var MESSAGE_FAIL_LOADING = 'epframe.fail_loading';
    var MESSAGE_RESIZE = 'epframe.resize';
    var MESSAGE_LOADED = 'epframe.loaded';
    var MESSAGE_EXIT = 'epframe.exit';
    var MESSAGE_REDIRECT = 'epframe.redirect';
    var MESSAGE_REDIRECT_IFRAME = 'epframe.redirect_iframe';
    var MESSAGE_REDIRECT_IFRAME_COMPLETE = 'epframe.redirect_iframe_complete';
    var MESSAGE_TEMPLATE_NAME = 'epframe.template_name';
    var MESSAGE_WITH_QR_PAY = 'epframe.with_qr_pay';
    var MESSAGE_CHANGE_CROSS_COLOR = 'epframe.cross_color';
    var MESSAGE_RESIZE_FROM_ANOTHER_SRC = 'epframe.resize_from_another_src';
    var MESSAGE_REMOVE_CSS_CLASS = 'epframe.remove_css_class';
    var MESSAGE_ADD_CSS_CLASS = 'epframe.add_css_class';
    var MESSAGE_CHECK_VALIDATION = 'epframe.embedded_mode.check_validation';
    var MESSAGE_ATTACH_FIELDS_AND_SUBMIT = 'epframe.embedded_mode.submit';
    var MESSAGE_EXTERNAL_WIDGET_FORM_SUBMISSION = 'epframe.external_widget_form_submission';
    var MESSAGE_ACS_PARENT_PAGE_REDIRECT_RUN = 'epframe.acs_parent_page_redirect_run';
    var MESSAGE_APPLE_PAY_BUTTON_CLICKED = 'epframe.apple_pay.button_clicked';
    var MESSAGE_APPLE_PAY_SESSION_DATA_RECEIVED = 'epframe.apple_pay.session_data_received';
    var MESSAGE_APPLE_PAY_BEGIN_PAYMENT = 'epframe.apple_pay.begin_payment';
    var MESSAGE_APPLE_PAY_COMPLETE_PAYMENT = 'epframe.apple_pay.complete_payment';
    var MESSAGE_APPLE_PAY_ON_PAYMENT_AUTHORIZED = 'epframe.apple_pay.on_payment_authorized';
    var MESSAGE_APPLE_PAY_ON_CANCEL = 'epframe.apple_pay.on_cancel';
    var MESSAGE_APPLE_PAY_REQUEST_AVAILABILLITY = 'epframe.apple_pay.request_availability';
    var MESSAGE_APPLE_PAY_IS_AVAILABLE = 'epframe.apple_pay.available_on_parent_page';

    var MODE_PURCHASE = 'purchase';

    var FRAME_MODE_IFRAME = 'iframe';
    var FRAME_MODE_POPUP = 'popup';
    var FRAME_MODE_TAB = 'tab';

    /**
     * Class for widget instance
     * @param {string} guid
     * @param {HTMLElement} btn
     * @param {Object} config
     * @param {string} method
     * @constructor
     */
    var PayWidget = function (guid, btn, config, method) {
        var widgetInstance = this;
        this.btn = btn;
        this.iframe = null;
        this.guid = guid;
        this.method = method || 'get';
        this.widgetLoaded = false;
        this.frameMode = FRAME_MODE_TAB;
        this.callback_last_state = {
            onResize: {width: 0, height: 0},
            onAmountChange: {value: undefined},
            onTabChange: {tab: undefined}
        };

        this.applePaySession = null;

        this.getBaseUrl = function () {
            if (config.baseUrl) {
                return config.baseUrl;
            } else {
                return WidgetLibrary.getBaseUrl();
            }
        };

        /**
         * Validate config and fix it if possible
         * @param config
         */
        this.validateConfig = function (config) {

            var allowedModes = ['purchase', 'payout', 'card_tokenize', 'card_verify', 'money_transfer', 'presentation',];

            if (config.mode && allowedModes.indexOf(config.mode) < 0) {
                throw "Invalid config.mode. Use: " + allowedModes.concat(' | ');
            }

            if (config.mode === MODE_PURCHASE && (!config.payment_id || !config.payment_currency)) {
                throw "Payment not specified.";
            }

        };

        /**
         * Default onExit callback
         */
        this.onExit = function () {
            var modal_el = document.getElementById(MODAL_CONTAINER_ID);
            var modal_body_el = document.getElementById(MODAL_BODY_ID);
            document.getElementById('ep-modal-wrap').classList.remove("loaded");
            modal_body_el.removeAttribute("style");
            modal_el.classList.remove('shown');
        };

        this.showIframeRedirect = function () {
            document.getElementById('ep-modal-wrap').classList.add("with-asc");
        };

        this.redirectComplete = function () {
            document.getElementById('ep-modal-wrap').classList.remove("with-asc");
        };

        /**
         * Show widget in site DOM element
         */
        this.showInSiteElement = function () {
            var target_element = config.target_element;
            var el = null;

            var $submitButton = document.querySelector("[data-epwidget=" + BTN_EXTERNAL_SUBMIT + "]");

            if ($submitButton) {
                $submitButton.addEventListener('click', function () {
                    widgetInstance.externalSubmit();
                });
            }

            this.setFrameMode(FRAME_MODE_IFRAME);

            if (typeof target_element == 'string') {
                el = document.getElementById(target_element);
            } else {
                el = config.target_element
            }

            if (!el) {
                throw "Invalid target_element";
            }

            if (el.childNodes[0]) {
                this.unloadIframe(el.childNodes[0]);
            }

            var iframe = this.createIframe();

            iframe.addEventListener('load', function () {
                for (var i = 0; i < el.childNodes.length; i++) {
                    if (el.childNodes[i].id != 'iframe-' + widgetInstance.guid) {
                        el.removeChild(el.childNodes[i]);
                    }
                }
            });
            widgetInstance.appendToDomElement(el, true);

            this.submitIframe();
        };

        /**
         * Open widget in redirect mode on new browser tab
         */
        this.showNewTab = function () {
            window.location.href = this.buildFullUrl();
        };

        /**
         * Show modal window for widget
         */
        this.showPopup = function () {
            this.setFrameMode(FRAME_MODE_POPUP);
            //create iframe
            this.createIframe();

            //append iframe to popup
            var modal_body_el = document.getElementById(MODAL_BODY_ID);
            this.appendToDomElement(modal_body_el, true);
            this.submitIframe();

            //create close button
            var closeBtn = document.getElementById(BTN_CLOSE_ID);
            var widgetCloseBtn = closeBtn.cloneNode(true);
            document.getElementById(MODAL_CONTAINER_ID).childNodes[0].replaceChild(widgetCloseBtn, closeBtn);
            widgetCloseBtn.addEventListener('click', widgetInstance.closePopup);

            var modalWrapEl = document.getElementById(MODAL_CONTAINER_ID);

            modalWrapEl.className = "";

            if (this.config.css_modal_wrap) {
                modalWrapEl.classList.add(this.config.css_modal_wrap);
            }

            if (WidgetLibrary.isMobile()) {
                modalWrapEl.classList.add('modal-mobile');
            }

            WidgetLibrary.showModal();

            if (config.close_on_missclick) {
                var backdrop_el = document.getElementById(MODAL_CONTAINER_ID);
                backdrop_el.addEventListener('click', widgetInstance.closePopup);
            }
        };

        this.setFrameMode = function (mode) {
            this.frameMode = mode;
        };

        /**
         * Close modal window
         */
        this.closePopup = function () {
            widgetInstance.sendPostMessage({message: 'close'});
            widgetInstance.onExit();
            if (widgetInstance.config.onExit && typeof widgetInstance.config.onExit == 'function') {
                widgetInstance.config.onExit.apply(widgetInstance, []);
            }
            var backdrop_el = document.getElementById(MODAL_CONTAINER_ID);
            backdrop_el.removeEventListener('click', widgetInstance.closePopup);
            widgetInstance.redirectComplete();
            widgetInstance.unloadIframe(widgetInstance.iframe);
        };

        this.externalSubmit = function () {
            widgetInstance.sendPostMessage({message: MESSAGE_EXTERNAL_WIDGET_FORM_SUBMISSION});
        };

        /**
         * Append new element to DOM
         * @param el
         * @param clean
         */
        this.appendToDomElement = function (el, clean) {
            var widget = this;

            if (clean) {
                el.innerHTML = '';
            }

            el.appendChild(widgetInstance.iframe);

            widgetInstance.iframe.onload = function () {
                widgetInstance.iframe.contentWindow.postMessage(JSON.stringify({
                    message: 'link',
                    guid: widgetInstance.guid,
                }), '*')
            };

        };

        /**
         * Bind listeners
         */
        this.bindLisenetrs = function () {
            this.btn.addEventListener('click', function () {
                widgetInstance.run();
            });

            window.onresize = function (event) {
                widgetInstance.sendPostMessage({message: 'resize'});
            };
        };

        /**
         * run widget
         */
        this.run = function () {
            this.triggerCallbackByName('onRun');
            if (config.redirect) {
                widgetInstance.showNewTab();
            } else if (config.redirect_on_mobile && WidgetLibrary.isMobile()) {
                widgetInstance.showNewTab();
            } else if (config.hasOwnProperty('target_element') && config.target_element) {
                widgetInstance.showInSiteElement();
            } else {
                widgetInstance.showPopup();
            }
        };

        /**
         * Convert post message to callback function and trigger
         *
         * @param msg
         */
        this.triggerCallbackFromPostMessage = function (msg) {

            function _isChangeCallback(fnName) {
                return ['onResize', 'onAmountChange', 'onTabChange'].indexOf(fnName) + 1;
            }

            function _triggerIfChange(fn, data) {
                if (_isChangeCallback(fn)) {
                    switch (fn) {
                        case 'onAmountChange':
                            if (widgetInstance.callback_last_state.onAmountChange.value == data.value) {
                                return;
                            } else {
                                widgetInstance.callback_last_state.onAmountChange.value = data.value
                            }
                            break;
                        case 'onTabChange':
                            if (widgetInstance.callback_last_state.onTabChange.tab == data.tab) {
                                return;
                            } else {
                                widgetInstance.callback_last_state.onTabChange.tab = data.tab
                            }
                            break;
                        case 'onResize':
                            if (widgetInstance.callback_last_state.onResize.width == data.width && widgetInstance.callback_last_state.onResize.height == data.height) {
                                return;
                            } else {
                                widgetInstance.callback_last_state.onResize.width = data.width;
                                widgetInstance.callback_last_state.onResize.height = data.height;
                            }
                            break;
                    }
                }
                widgetInstance.triggerCallbackByName(fn, data);
            }

            var fn = ('on.' + msg.message.replace('epframe.', '')).toCamelCase();

            _triggerIfChange(fn, msg.data);
        };

        /**
         * Trigger callback function by name
         * @param callbackName
         * @param data
         */
        this.triggerCallbackByName = function (callbackName, data) {
            if (widgetInstance.config.hasOwnProperty(callbackName) && typeof(widgetInstance.config[callbackName]) == 'function') {
                widgetInstance.config[callbackName].apply(this, [data]);
            }
        };

        /**
         * Handle post message received from iframe
         * @param eventData
         */
        this.handlePostMessage = function (eventData) {
            console.log('%cPost message received','color: green', eventData);

            switch (eventData.message) {
                case MESSAGE_FAIL_LOADING:
                    eventData.data.config = widgetInstance.config;
                    this.widgetLoaded = true;
                    break;
                case MESSAGE_RESIZE:
                    widgetInstance.modalResize(eventData.data.width, eventData.data.height);
                    break;
                case MESSAGE_LOADED:
                    this.widgetLoaded = true;
                    widgetInstance.modalResize(eventData.data.width, eventData.data.height);
                    document.getElementById('ep-modal-wrap').classList.add("loaded");
                    break;
                case MESSAGE_EXIT:
                    widgetInstance.onExit();
                    break;
                case MESSAGE_REDIRECT:
                    if (this.isValidRedirect(eventData.data.url)) {
                        window.location.href = eventData.data.url;
                        widgetInstance.onExit();
                    }
                    break;
                case MESSAGE_REDIRECT_IFRAME:
                    widgetInstance.showIframeRedirect();
                    break;
                case MESSAGE_REDIRECT_IFRAME_COMPLETE:
                    widgetInstance.redirectComplete();
                    break;
                case MESSAGE_TEMPLATE_NAME:
                    widgetInstance.addMerchantCss(eventData.data);
                    break;
                case MESSAGE_WITH_QR_PAY:
                    widgetInstance.addMerchantCss(eventData.data);
                    break;
                case MESSAGE_CHANGE_CROSS_COLOR:
                    widgetInstance.changeCrossColor(eventData.data);
                    break;
                case MESSAGE_RESIZE_FROM_ANOTHER_SRC:
                    var height = eventData.height ? eventData.height : window.innerHeight;
                    var width = eventData.width;
                    var msg = {
                        formAnotherSrc: true,
                        height: height,
                        width: width
                    }
                    widgetInstance.modalResize(width, height);
                    widgetInstance.iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
                    break;
                case MESSAGE_REMOVE_CSS_CLASS:
                    widgetInstance.removeCssClass(eventData.data);
                    break;
                case MESSAGE_ADD_CSS_CLASS:
                    widgetInstance.addCssClass(eventData.data);
                    break;
                case MESSAGE_CHECK_VALIDATION:
                    widgetInstance.sendPostMessage({message: MESSAGE_CHECK_VALIDATION});
                    break;
                case MESSAGE_ATTACH_FIELDS_AND_SUBMIT:
                    widgetInstance.sendPostMessage(eventData);
                    break;
                case MESSAGE_ACS_PARENT_PAGE_REDIRECT_RUN:
                    widgetInstance.runParentPage3dsRedirect(eventData.data);
                    break;
                case MESSAGE_APPLE_PAY_REQUEST_AVAILABILLITY:
                    widgetInstance.applePayCheckAvailability();
                    break;
                case MESSAGE_APPLE_PAY_BUTTON_CLICKED:
                    widgetInstance.initApplePaySession(eventData.data);
                    break;
                case MESSAGE_APPLE_PAY_SESSION_DATA_RECEIVED:
                    widgetInstance.applePayCompleteValidation(eventData.data);
                    break;
                case MESSAGE_APPLE_PAY_BEGIN_PAYMENT:
                    widgetInstance.applePaySession.begin();
                    break;
                case MESSAGE_APPLE_PAY_COMPLETE_PAYMENT:
                    widgetInstance.applePaySession.completePayment(eventData.data.status);
                    break;
            }

            widgetInstance.triggerCallbackFromPostMessage(eventData);
        };

        this.isValidRedirect = function (url) {
            if (typeof url === 'string') {
                var invalidProtocols = ['javascript:', 'vbscript:', 'data:'];
                var urlToParse = url.indexOf('//') === 0
                    ? `https:${url}`
                    : url;

                try {
                    if (invalidProtocols.includes(new URL(urlToParse).protocol)) {
                        return false;
                    }
                } catch (e) {
                    return false;
                }

                return true;
            }

            return false;
        }

        /**
         * Create iframe DOM element
         * @returns {Element}
         */
        this.createIframe = function () {
            var ifrm = document.createElement("iframe");
            ifrm.classList.add('ep-iframe');
            ifrm.style.display = 'block';
            ifrm.id = 'iframe-' + widgetInstance.guid;
            ifrm.name = ifrm.id;
            ifrm.setAttribute('scrolling', 'no');
            ifrm.setAttribute('allowPaymentRequest', 'true');
            this.iframe = ifrm;
            if(config.apple_allow_payment) {
                ifrm.setAttribute('allow', 'payment');
            }

            WidgetLibrary.registerPostListener(this);

            return ifrm;
        };

        /**
         * @private
         */
        this.submitIframe = function () {
            this.checkIframeLoading();

            if (this.method && this.method.toLocaleLowerCase() === 'post') {
                var form = this.buildForm();
                document.body.appendChild(form);
                form.submit();
                document.body.removeChild(form);
            } else {
                this.iframe.setAttribute("src", this.buildFullUrl());
            }
        };

        /**
         * @private
         */
        this.checkIframeLoading = function () {
            this.iframe.addEventListener('load', function () {
                setTimeout(function () {
                    if (!this.widgetLoaded) {
                        this.handlePostMessage({
                            message: MESSAGE_FAIL_LOADING,
                            data: {
                                message: 'Network problem',
                            },
                        });
                    }
                }.bind(this), 5000);
            }.bind(this));
        };

        this.sendPostMessage = function (msg) {
            if (this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage(JSON.stringify(msg), '*');
            }
        };

        /**
         *
         * @param btn
         * @param config
         * @private
         */
        this.init = function (btn, config) {
            widgetInstance.config = _extendCfgFromDataAttributes(btn, config);
            widgetInstance.validateConfig(config);
            widgetInstance.bindLisenetrs();
            widgetInstance.addMerchantCss();
        };

        /**
         * Resize modal window by widget content size
         * @param width
         * @param height
         */
        this.modalResize = function (width, height) {

            var iframe = this.iframe;

            if (height == undefined) {
                height = iframe.offsetHeight;
            }

            iframe.style.height = height + 'px';

            var modal = document.getElementById(MODAL_BODY_ID);
            modal.style.height = height + 'px';
            iframe.style.display = 'block';
        };

        /**
         * @param {String} encryptedUrl
         * @returns {PayWidget}
         */
        this.setEncryptedURL = function (encryptedUrl) {
            this.encryptedUrl = encryptedUrl;

            return this;
        }

        /**
         * @returns {String}
         */
        this.buildUrl = function () {
            var getParamsTail = '';
            var config = this.config;
            config.frame_mode = this.frameMode;

            for (var k in config) {
                if (config.hasOwnProperty(k)) {
                    if (typeof config[k] !== 'function' && typeof config['k'] !== 'object') {
                        getParamsTail = WidgetLibrary.addGetParam(getParamsTail, k, config[k]);
                    }
                }
            }

            var _sw = screen.width;
            var _sh = screen.height;

            getParamsTail = WidgetLibrary.addGetParam(getParamsTail, '_sw', _sw);
            getParamsTail = WidgetLibrary.addGetParam(getParamsTail, '_sh', _sh);

            return BASE_PATH + getParamsTail;
        }

        /**
         * @returns {String}
         * @private
         */
        this.buildFullUrl = function () {
            var urlPathQuery = this.encryptedUrl ? this.encryptedUrl : this.buildUrl();

            return this.getBaseUrl() + urlPathQuery;
        };

        /**
         * @returns {HTMLFormElement}
         * @private
         */
        this.buildForm = function () {
            var cfg = this.config;
            var form = document.createElement('form');
            cfg.frame_mode = this.frameMode;
            form.setAttribute('method', 'post');
            form.setAttribute('action', this.getBaseUrl() + BASE_PATH);
            form.setAttribute('target', this.iframe.name);

            for (var key in cfg) {
                if (cfg.hasOwnProperty(key) &&
                    typeof cfg[key] !== 'function' && typeof cfg[key] !== 'object'
                ) {
                    var hiddenField = document.createElement('input');
                    hiddenField.type = 'hidden';
                    hiddenField.name = key;
                    hiddenField.value = config[key];
                    form.appendChild(hiddenField);
                }
            }
            return form;
        };

        /**
         *
         * @param btn
         * @param config
         * @returns {*}
         * @private
         */
        function _extendCfgFromDataAttributes(btn, config) {
            if ('referrer' in document) {
                config._referrer = document.referrer;
            }
            return config;
        }

        /**
         * @param templateName
         * @private
         */
        this.addMerchantCss = function (templateName) {

            var cssPrefix = templateName ? templateName : null;
            var modal_el = document.getElementById(MODAL_CONTAINER_ID);

            if (templateName != null) {
                modal_el.classList.add(cssPrefix)
            } else {
                modal_el.classList.remove(cssPrefix)
            }
        }

        /**
         * @param className
         * @private
         */
        this.removeCssClass = function (className) {

            var modal_el = document.getElementById(MODAL_CONTAINER_ID);

            if (className != null && className != '') {
                modal_el.classList.remove(className)
            }
        }

        /**
         * @param className
         * @private
         */
        this.addCssClass = function (className) {

            var modal_el = document.getElementById(MODAL_CONTAINER_ID);

            if (className != null && className != '') {
                modal_el.classList.add(className)
            }
        }

        this.changeCrossColor = function (type) {
            type = type.replace(/"/g,'')
            var el = document.getElementById(BTN_CLOSE_ID);
            el.classList.add(type);
        }

        /**
         * Unload iframe to log page unload events correctly
         *
         * @param iframe
         * @private
         */
        this.unloadIframe = function (iframe) {
            if (iframe && typeof iframe.setAttribute === 'function') {
                iframe.setAttribute('src', '');
            }
        }

        /**
         * Build and submit hidden form for acs redirect run
         *
         * @param data eventData from postMessage
         */
        this.runParentPage3dsRedirect = function (data) {
            var form = document.createElement('form');
            form.setAttribute('method', data.method);
            form.setAttribute('action', data.url);
            form.setAttribute('style', 'display:none;');
            form.setAttribute('name', '3dsForm');
            for (let k in data.body) {
                const input = document.createElement('input')
                input.name = k;
                input.value = data.body[k];
                form.appendChild(input);
            }
            document.body.appendChild(form)
            form.submit();
        }

        this.initApplePaySession = function (data) {
            if(!ApplePaySession || !ApplePaySession.canMakePayments()) {
                console.error('Apple pay library can\'t make payment');
                return;
            }
            widgetInstance.applePaySession = new window.ApplePaySession(data.apiVersion, data.sessionParams);
            widgetInstance.applePaySession.onvalidatemerchant = function(event) {
                widgetInstance.sendPostMessage({
                    message:"epframe.apple_pay.on_validate_merchant",
                    data:{validationURL: event.validationURL, origin: window.location.origin}
                });
            }
            widgetInstance.applePaySession.onpaymentauthorized = function(event) {
                widgetInstance.sendPostMessage({
                    message: MESSAGE_APPLE_PAY_ON_PAYMENT_AUTHORIZED,
                    data: event.payment,
                });
            }
            widgetInstance.applePaySession.oncancel = function() {
                widgetInstance.sendPostMessage({
                    message: MESSAGE_APPLE_PAY_ON_CANCEL,
                });
                try {
                    widgetInstance.applePaySession.abort();
                } catch (e) {}
            }
        }

        this.applePayCompleteValidation = function(data) {
            try {
                widgetInstance.applePaySession.completeMerchantValidation(JSON.parse(data.merchantSession));
            } catch (e) {
                console.log('Apple Pay completeMerchantValidation error:', e);
            }
        }

        this.applePayCheckAvailability = function() {
            if (window.hasOwnProperty('ApplePaySession') && ApplePaySession.canMakePayments()) {
                widgetInstance.sendPostMessage({message: MESSAGE_APPLE_PAY_IS_AVAILABLE, data: {isAvailable: true}});
            } else {
                widgetInstance.sendPostMessage({message: MESSAGE_APPLE_PAY_IS_AVAILABLE, data: {isAvailable: false}});
            }
        }

        this.init(btn, config);
    };

    /**
     * Library
     * @type {{create: WidgetLibrary.create, appendHtml: WidgetLibrary.appendHtml}}
     */
    var WidgetLibrary = {

        baseUrl: null,

        /**
         * Start point for widget init
         * @param pay_btn_id
         * @param {Object} config
         * @param {string} method
         * @returns {PayWidget}
         */
        bind: function (pay_btn_id, config, method) {
            var payBtnEl = document.getElementById(pay_btn_id);
            if (!payBtnEl) {
                payBtnEl = document.createElement('button');
            }
            var widgetConfig = config;
            this.appendHtml();
            return new PayWidget(WidgetLibrary.guid(4), payBtnEl, widgetConfig, method);
        },

        /**
         * Create widget instance
         * @param {Object} config
         * @param {string} method
         * @returns {PayWidget}
         */
        create: function (config, method) {
            return this.bind(null, config, method);
        },

        /**
         * Run widget immediate
         * @param {Object} config
         * @param {string} method
         * @returns {*}
         */
        run: function (config, method) {
            var inst = this.create(config, method);
            inst.run();
            return inst;
        },

        /**
         * create DOM elements or get exist and bind it to widget
         */
        appendHtml: function () {
            var modal_container_el = document.getElementById(MODAL_CONTAINER_ID);
            if (!modal_container_el) {
                modal_container_el = document.createElement('div');
                modal_container_el.setAttribute('id', MODAL_CONTAINER_ID);

                var modal_wrap_el = document.createElement('div');
                modal_wrap_el.setAttribute('class', 'ep-modal-wrap');
                modal_wrap_el.setAttribute('id', 'ep-modal-wrap');
                modal_container_el.appendChild(modal_wrap_el);


                var modal_body_el = document.createElement('div');
                modal_body_el.setAttribute('id', MODAL_BODY_ID);
                modal_wrap_el.appendChild(modal_body_el);

                var btn_close_el = document.createElement('button');
                btn_close_el.setAttribute('id', BTN_CLOSE_ID);
                modal_wrap_el.appendChild(btn_close_el);

                document.body.appendChild(modal_container_el);
            }
        },

        /**
         * Show modal window
         */
        showModal: function () {
            var modal = document.getElementById(MODAL_CONTAINER_ID);
            modal.classList.add('shown');
        },

        /**
         * Extend config function
         * @param out
         * @returns {*|{}}
         */
        cfgExtend: function (out) {
            out = out || {};

            for (var i = 1; i < arguments.length; i++) {
                var obj = arguments[i];

                if (!obj)
                    continue;

                for (var key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        if (typeof obj[key] === 'object')
                            out[key] = WidgetLibrary.cfgExtend(out[key], obj[key]);
                        else
                            out[key] = obj[key];
                    }
                }
            }

            return out;
        },

        /**
         * Generate GUID
         * @param blocksCount
         * @returns {string}
         */
        guid: function (blocksCount) {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000)
                    .toString(16)
                    .substring(1);
            }

            var result = '';
            for (var i = 0; i < blocksCount; i++) {
                if (i > 0) {
                    result += '-';
                }
                result += s4();
            }
            return result;
        },

        /**
         * Register post message listener for all widget one time
         * @param widgetInstance
         */
        registerPostListener: function (widgetInstance) {
            if (window['widget' + widgetInstance.guid + '_post_listener'] === true) {
                return;
            }

            function _resolvePostMessageToWidgetInstance(e) {
                try {
                    var data = JSON.parse(e.data);
                    if ((data.guid && data.guid === widgetInstance.guid) || data.from_another_domain) {
                        widgetInstance.handlePostMessage(data);
                    }
                } catch (error) {}
            }

            if (window.addEventListener) {
                window.addEventListener("message", _resolvePostMessageToWidgetInstance);
            } else {
                window.attachEvent("onmessage", _resolvePostMessageToWidgetInstance);
            }

            window['widget' + widgetInstance.guid + '_post_listener'] = true;
        },

        /**
         * Check client browser is mobile
         * @returns {boolean}
         */
        isMobile: function () {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent.toString());
        },

        /**
         * Get host of merchant.js file
         * @returns {null}
         */
        getBaseUrl: function () {

            if (this.baseUrl === null) {
                var host = null;

                var scripts = document.getElementsByTagName('script');

                for (var i = 0; i < scripts.length; i++) {
                    var src = scripts[i].src;
                    if (/.*?\/merchant.js$/.test(src)) {
                        var match = /(http(s)?\:\/\/[\w+\.-]+)/.exec(src);
                        if (match !== null) {
                            this.baseUrl = match[0];
                        } else {
                            throw "Can't get base url of your merchant.js script. Use cfg.baseUrl";
                        }
                        break;
                    }
                }

            }

            return this.baseUrl;
        },

        /**
         *
         * @param url
         * @param param
         * @param value
         * @returns {*}
         */
        addGetParam: function (url, param, value) {
            if (value === undefined) {
                return url;
            }
            return url + (/\?/.test(url) ? '&' : '?') + param + '=' + encodeURIComponent(value);
        }
    };

    /**
     * Convert underscore_string to camelCase string
     * @returns {string}
     */
    String.prototype.toCamelCase = function () {
        return this
            .replace(/[_\. ](.)/g, function ($1) {
                return $1.toUpperCase();
            })
            .replace(/\s|\.|_/g, '')
            .replace(/^(.)/, function ($1) {
                return $1.toLowerCase();
            });
    };

    window.EPayWidget = WidgetLibrary;

}());
