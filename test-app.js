function fakeSignature(paramsToSign, salt, callback) {
    //console.log('fakeSignature started. params:', paramsToSign);
    //console.log('params keys', Object.keys(paramsToSign));
    const orderedParams = Object.keys(paramsToSign).sort().reduce(
        (obj, key) => {
            obj[key] = paramsToSign[key];
            return obj;
        },
        {}
    );
    //console.log('orderedParams:', orderedParams);
    //console.log('ordered keys', Object.keys(orderedParams));
    var stringToSign = '';
    //orderedParams.forEach(key, value);
    Object.keys(orderedParams).forEach(function(key, index) {
        var keyValue = key + ':' + orderedParams[key];
        if (index !== 0) {
            keyValue = ';' + keyValue;
        }
        stringToSign += keyValue;
    });
    //console.log(stringToSign);
    var hash = CryptoJS.HmacSHA512(stringToSign, salt);
    var base64 = hash.toString(CryptoJS.enc.Base64);
    console.log('signature:', base64);
    callback(base64);
}
function writeLog(data, callbackName) {
    var outputElement = document.getElementById('custom-terminal-log');
    outputElement.innerHTML += '<samp>' + callbackName + ": " + JSON.stringify(data) + '</samp><br>';
}

window.widget = null;

var params = {};

var WIDGET_PARAMS = [
    'payment_currency',
    'language_code',
    'region_code',
    'mode',
    'project_id',
    'target_element',
    'payment_amount',
    'payment_id',
    'customer_id',
    'default_payment_method',
    'force_payment_method',
    'payment_description',
    'force_paged_mode',
    'css_modal_wrap',
    'redirect_on_mobile',
    'list_payment_block',
    'close_on_missclick',
    'force_acs_new_window',
    'redirect_success_url',
    'redirect_fail_url',
    'redirect_return_url',
    'merchant_success_url',
    'merchant_fail_url',
    'merchant_return_url',
    'merchant_callback_url',
    'merchant_success_redirect_mode',
    'payment_methods_options',
    'payment_extra_param',
    'merchant_fail_redirect_mode',
    'merchant_return_redirect_mode',
    'merchant_success_enabled',
    'merchant_fail_enabled',
    'merchant_return_enabled',
    'redirect_success_mode',
    'redirect_tokenize_mode',
    'redirect_tokenize_url',
    'redirect_fail_mode',
    'terminal_id',
    'style_id',
    'best_before',
    'account_token',
    'recurring_register',
    'additional_fields',
    'cash_voucher_data',
    'receipt_data',
    'addendum_data',
    'salt',
    'checkout_script',
    'debt_account',
    'via_telegram',
    'stored_card_type',
    'merchant_data',
    'booking_info',
];

var ENCODE_PARAMS = [
    'cash_voucher_data',
    'receipt_data',
    'addendum_data',
];

const ENV_PARAMS = [
    'base_url',
];

function getCustomCfg() {
    loadConfigFromForm(ENV_PARAMS);

    var cfg = loadConfigFromForm(WIDGET_PARAMS);
    if (cfg.additional_fields) {
        var ad_fields = cfg.additional_fields.split("\n");

        for (var field in ad_fields) {
            if (ad_fields.hasOwnProperty(field)) {
                var fieldstring = ad_fields[field].split("=");
                cfg[fieldstring[0].trim()] = fieldstring[1];
            }
        }

        delete cfg.additional_fields;
    }

    delete cfg.salt;

    prepareEncodeParams(cfg);

    console.log('%cCfg created: ', 'color: orange', cfg);

    return cfg;
}

function prepareEncodeParams(cfg) {
    for (var k in ENCODE_PARAMS) {
        var field = ENCODE_PARAMS[k];

        if (cfg.hasOwnProperty(field)) {
            cfg[field] = b64EncodeUnicode(cfg[field]);
        }
    }
}

function runIframe(method) {
    var cfg = getCustomCfg();

    cfg.onValidationStatusChange = function (data) {
        microframeModeErrorsHandler(data)
    }
    cfg.onReceivedServerErrors = function (data) {
        microframeModeErrorsHandler(data)
    }

    document.querySelector('#merchant-side-emulation').classList.remove('invisible')
    document.querySelector('#embedded-mode-errors-container').classList.add('hide')
    clearErrorsContainer(document.querySelector('#embedded-mode-errors-panel'))

    cfg.target_element = 'iframe-holder';
    cfg.baseUrl = getPaymentDomain(cfg);

    getSignature(cfg, function (signature) {
        cfg.signature = signature;
        console.log('%cRun iFrame with params', 'color: orange', cfg);

        window.widget = EPayWidget.run(cfg, method);
    });
}

function runCustomWidget(method) {
    var cfg = getCustomCfg();

    cfg.onFailLoading = function (data) {
        writeLog(data, 'onFailLoading');
    };
    cfg.onResize = function (data) {
        writeLog(data, 'onResize');
    };
    cfg.onTabChange = function (data) {
        writeLog(data, 'onTabChange');
    };
    cfg.onPaymentMethodSelect = function (data) {
        writeLog(data, 'onPaymentMethodSelect');
    };
    cfg.onLoaded = function (data) {
        writeLog(data, 'onLoaded');
    };
    cfg.onPaymentSuccess = function (data) {
        writeLog(data, 'onPaymentSuccess');
    };
    cfg.onPaymentSubmitResult = function (data) {
        writeLog(data, 'onPaymentSubmitResult');
    };
    cfg.onPaymentFail = function (data) {
        writeLog(data, 'onPaymentFail');
    };
    cfg.onExit = function (data) {
        writeLog(data, 'onExit');
    };
    cfg.onPaymentSent = function (data) {
        writeLog(data, 'onPaymentSent');
    };
    cfg.onAmountChange = function (data) {
        writeLog(data, 'onAmountChange');
    };
    cfg.onWalletSelected = function (data) {
        writeLog(data, 'onWalletSelected');
    };
    cfg.onWalletRemoved = function (data) {
        writeLog(data, 'onWalletRemoved');
    };
    cfg.onTokenizeSuccess = function (data) {
        writeLog(data, 'onTokenizeSuccess');
    };

    cfg.onRedirectIframe =  function (data) {
        writeLog(data, 'onRedirectIframe');
    },

        cfg.onRedirectIframeComplete = function (data) {
            writeLog(data, 'onRedirectIframeComplete');
        },

        cfg.onShowClarificationPage = function (data) {
            writeLog(data, 'onShowClarificationPage');
        },

        cfg.onSubmitClarificationForm = function (data) {
            writeLog(data, 'onSubmitClarificationForm');
        },

        cfg.onCardVerifySuccess = function (data) {
            writeLog(data, 'onCardVerifySuccess');
        },

        cfg.onCardVerifyFail = function (data) {
            writeLog(data, 'onCardVerifyFail');
        },

        cfg.baseUrl = getPaymentDomain(cfg);

    getSignature(cfg, function (signature) {
        cfg.signature = signature;
        console.log('%cRun widget with params', 'color: orange', cfg);
        window.widget = EPayWidget.run(cfg, method);
    });

    changeClassOnElement(document.body, 'add', 'with_ep_popup');

}

function buildRedirectUrl() {
    var cfg = getCustomCfg();
    var urlContainerEl = document.getElementById('url-container');
    urlContainerEl.innerText = 'Building url...';

    getSignature(cfg, function (signature) {
        cfg.signature = signature;
        var urlParamsString = encodeQueryData(cfg);
        var urlPathAndParams = "/payment?" + urlParamsString;
        var linkRender = function (fullUrl) {
            var link = document.createElement('a');
            link.href = fullUrl;
            link.target = '_blank';
            link.rel = 'opener';
            link.innerHTML = fullUrl.slice(0, 64) + '...';
            urlContainerEl.innerHTML = null;
            urlContainerEl.appendChild(link);
        };

        linkRender(getPaymentDomain(cfg) + urlPathAndParams);
    });
}

function buildRedirectPost() {
    var cfg = getCustomCfg();
    var urlContainerEl = document.getElementById('url-container');
    urlContainerEl.innerHTML = 'Building form...';
    getSignature(cfg, function (signature) {
        cfg.signature = signature;
        var form = buildForm(cfg);
        urlContainerEl.innerHTML = null;
        urlContainerEl.appendChild(form);
    });
}

function sendPostMessage() {
    window.widget.sendPostMessage(JSON.parse(document.getElementById('post_message_body').value));
}

function buildForm(cfg) {
    var method = 'post';
    var form = document.createElement('form');
    form.setAttribute('method', method);
    form.setAttribute('action', getPaymentDomain(cfg)+ '/payment');
    form.setAttribute('target', '_blank');

    for (var key in cfg) {
        if (cfg.hasOwnProperty(key)) {
            var hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.name = key;
            hiddenField.value = cfg[key];

            form.appendChild(hiddenField);
        }
    }

    var submitEl = document.createElement('button');
    submitEl.innerHTML = 'Redirect by POST ' + cfg.payment_id;
    submitEl.type = 'submit';
    submitEl.className = 'btn btn-primary text-center btn-sm';
    form.appendChild(submitEl);
    return form;
}


/**
 * @param key
 * @param value
 * @returns {boolean}
 */
function isConfigParam(key, value) {
    return typeof(value) !== 'object'
        && typeof(value) !== 'function'
        && ['salt'].indexOf(key) === -1;
}

function getSignature(params, callback) {
    // console.log('getSignature started', params);
    var paramsToSign = {};
    for (var paramKey in params) {
        if (params.hasOwnProperty(paramKey)) {
            var paramValue = params[paramKey];
            if (isConfigParam(paramKey, paramValue)) {
                if (paramKey === 'payment_methods_options') {
                    paramValue = JSON.stringify(JSON.parse(paramValue.trim()));
                }
                paramsToSign[paramKey] = paramValue;
            }
        }
    }

    var url = "/test-app/get-signature/";
    var salt = document.getElementById('salt').value

    if (salt) {
        url += '?salt=' + salt;
    }

    var sortedParams = Object.keys(paramsToSign).sort(function (a, b) {
        return paramsToSign[a] - paramsToSign[b]
    });
    console.log('sortedParams', sortedParams);
    var logObj = {};

    for (var k in sortedParams) {
        logObj[sortedParams[k]] = paramsToSign[sortedParams[k]];
    }

    console.log('%cParams to sign: ', 'color: orange', logObj);
    fakeSignature(paramsToSign, salt, callback);
    //sendPOST(url, paramsToSign, callback);
}

function sendPOST(URL, data, callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            console.log('%cParams signed as ', 'color: orange', this.responseText);
            callback(this.responseText);
        }
    };

    xmlhttp.open("POST", URL, true);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.send(JSON.stringify(data));
}

function cleanElement(elementId) {
    document.getElementById(elementId).innerHTML = '';
}

function restoreTestForm() {

    if (!isLocalstorageAvailable()) return;

    if (!getLocalstorageFormItem('payment_currency') && !getLocalstorageFormItem('payment_amount')) {
        return;
    }

    restoreDomValuesFromLocalstorage(WIDGET_PARAMS);
    restoreDomValuesFromLocalstorage(ENV_PARAMS);
}

function setLocalstorageFormItem(item, value) {
    if (!isLocalstorageAvailable()) return;
    window.localStorage.setItem('ep_tf_' + item, value);
}

function getLocalstorageFormItem(item) {
    if (!isLocalstorageAvailable()) return;
    return window.localStorage.getItem('ep_tf_' + item);
}

function encodeQueryData(data) {
    var ret = [];
    for (var d in data) {
        ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
    }
    return ret.join('&');
}

function isLocalstorageAvailable() {
    try {
        localStorage.setItem('test', '1');
        localStorage.removeItem('test');
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Restore form from local storage after reload
 * @param params
 */
function restoreDomValuesFromLocalstorage(params) {
    for (var i = 0; i < params.length; i++) {
        var element = document.getElementsByName(params[i])[0];
        if (!element) {
            console.warn('Cannot find element:', params[i]);
            continue;
        }
        if (element.getAttribute('type') === 'checkbox') {
            element.checked = parseInt(getLocalstorageFormItem(params[i])) === 1;
        } else {
            element.value = getLocalstorageFormItem(params[i]);
        }
    }
}

/**
 * Build request config from form values
 * @param params
 * @return {{}}
 */
function loadConfigFromForm(params) {
    var cfg = {};
    var elementsState = {};

    for (var i = 0; i < params.length; i++) {
        var element = document.getElementsByName(params[i])[0];
        if (!element) {
            console.warn('Cannot find element:', params[i]);
            continue;
        }

        if (element.getAttribute('type') === 'checkbox') {
            element.checked ? cfg[params[i]] = 1 : 0;
            elementsState[params[i]] = element.checked ? 1 : 0;
        } else {
            elementsState[params[i]] = element.value;
            if (element.value !== "") {
                if (params[i] === 'payment_methods_options') {
                    element.value = JSON.stringify(JSON.parse(element.value.trim()));
                }
                cfg[params[i]] = element.value;
            }
        }
    }


    var dynamicParams = [];
    if (!cfg.payment_id && cfg.mode !== 'card_tokenize') {
        cfg.payment_id = 'EP' + EPayWidget.guid(2);
        dynamicParams = ['payment_id'];
    }

    rememberConfig(elementsState, dynamicParams);

    return cfg;
}

function rememberConfig(cfg, excluded) {

    if (isLocalstorageAvailable() && !window.localStorage.ep_test_app) {
        window.localStorage.ep_test_app = {};
    }

    for (var param in cfg) {
        if (cfg.hasOwnProperty(param)) {
            var value = cfg[param];
            if (excluded && excluded.indexOf(param) + 1) {
                value = "";
            }
            setLocalstorageFormItem(param, value);
        }
    }

}

restoreTestForm();

window.addEventListener("message", postMessageHandler, false);

function postMessageHandler(eventData) {

    console.log('%cReceived postMessage: ', 'color: #398ce5', eventData.data);

    try {
        var eventDataJson = JSON.parse(eventData.data);
    } catch (e) {
        return;
    }

    if (eventDataJson.message === 'epframe.resize') {
        var iframeHolder = document.querySelector('#iframe-holder');
        var iframeControlWidth = document.querySelector('.iframe-control[data-target="width"]');
        var iframeControlHeight = document.querySelector('.iframe-control[data-target="height"]');

        iframeHolder.style.height = eventDataJson.data.height + 'px';
        iframeControlWidth.value = eventDataJson.data.width;
        iframeControlHeight.value = eventDataJson.data.height;
    }

    if (eventDataJson.message === 'epframe.destroy') {
        changeClassOnElement(document.body, 'remove' , 'with_ep_popup');
    }
}

const iframeControl = document.querySelectorAll('.iframe-control')

Array.prototype.forEach.call(iframeControl, function (el) {
    var iframeHolder = document.querySelector('#iframe-holder');
    el.oninput = function () {
        var iframe = document.querySelector('#iframe-holder iframe');
        iframeHolder.style[el.dataset.target] = el.value + 'px';
        if (iframe) iframe.style[el.dataset.target] = el.value + 'px';
    }
});

function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

// BURN CPU handlers
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function burnCPU(elem) {
    while (elem.checked) {
        await sleep(200);
        let result = 0;
        for (var i = Math.pow(11, 7); i >= 0; i--) {
            result += Math.atan(i) * Math.tan(i);
        }
        await sleep(500);
    }
}

const burnElement = document.querySelector('#burn_cpu');
burnElement.removeAttribute('checked');
burnElement.addEventListener('click', () => {
    burnCPU(burnElement);
});

const widgetGet = document.getElementById('widget_get');
widgetGet.addEventListener('click', () => {
    runCustomWidget();
});

const widgetPost = document.getElementById('widget_post');
widgetPost.addEventListener('click', () => {
    runCustomWidget('post');
});

const runIframeGet = document.getElementById('runIframe_get');
runIframeGet.addEventListener('click', () => {
    runIframe();
});

const runIframePost = document.getElementById('runIframe_post');
runIframePost.addEventListener('click', () => {
    runIframe('post');
});

const buildRedirectUrlGet = document.getElementById('buildRedirectUrl-get');
buildRedirectUrlGet.addEventListener('click', () => {
    buildRedirectUrl();
});

const buildRedirectUrlPost = document.getElementById('buildRedirectUrl-post');
buildRedirectUrlPost.addEventListener('click', () => {
    buildRedirectPost();
});

const sendPostMessageBtn = document.getElementById('sendPostMessage');
sendPostMessageBtn.addEventListener('click', () => {
    sendPostMessage();
});

const sortOptions = document.querySelectorAll(['#force_payment_method', '#language_code'])
Array.prototype.forEach.call(sortOptions, (sel) => {
    [...sel.children].sort((a, b) => a.text > b.text ? 1 : a.text < b.text ? -1 : 0).forEach(el => sel.appendChild(el));
});

function changeClassOnElement(el, type, el_class) {
    if(!'classList' in document.createElement('p')) return;
    if(type == 'add') {
        el.classList.add(el_class)
    } else {
        el.classList.remove(el_class)
    }

}

function getPaymentDomain(cfg) {
    const alternativeBaseUrl = document.getElementsByName('base_url')[0].value;

    if (alternativeBaseUrl) {
        return alternativeBaseUrl;
    }

    return window.location.origin;
}

function microframeModeErrorsHandler(errors) {
    var $errorsContainer = document.querySelector('#embedded-mode-errors-container')
    var $errorsPanel = document.querySelector('#embedded-mode-errors-panel');

    if (!Object.values(errors).length) {
        $errorsContainer.classList.add('hide')
        return;
    }

    clearErrorsContainer($errorsPanel)
    $errorsContainer.classList.remove('hide')

    Object.values(errors).forEach((item) => {
        var div = document.createElement('div')
        div.textContent = item
        $errorsPanel.appendChild(div)
    })
}

function clearErrorsContainer(el) {
    el.innerHTML = '';
}
