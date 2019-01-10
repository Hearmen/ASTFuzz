
exports.analyze = analyze;


var ScopeManager = require('./scope-manager').default;
var PathManager = require('./path-manager');
var Referencer = require('./referencer');
var Reference = require('./reference').default;
var Variable = require('./variable');
var Scope = require('./scope');
var Path = require('./path');

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; }; 

/*
 从 escope 抄来的，目前除了 childVisitorKeys 外没有启用
*/
function defaultOptions() {
    return {
        optimistic: false,
        directive: false,
        nodejsScope: false,
        impliedStrict: false,
        sourceType: 'script', // one of ['script', 'module']
        ecmaVersion: 5,
        childVisitorKeys: null,
        fallback: 'iteration'
    };
}


/*
 更新对象中的属性信息
*/
function updateDeeply(target, override) {
    var key, val;

    function isHashObject(target) {
        return (typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object' && target instanceof Object && !(target instanceof Array) && !(target instanceof RegExp);
    }

    for (key in override) {
        if (override.hasOwnProperty(key)) {
            val = override[key];
            if (isHashObject(val)) {
                if (isHashObject(target[key])) {
                    updateDeeply(target[key], val);
                } else {
                    target[key] = updateDeeply({}, val);
                }
            } else {
                target[key] = val;
            }
        }
    }
    return target;
}

function analyze(tree, scopeManager, providedOptions) {
    var pathManager, referencer, options;

    options = updateDeeply(defaultOptions(), providedOptions);

    pathManager = new PathManager(options);

    referencer = new Referencer(options, scopeManager, pathManager);
    referencer.visit(tree);

    return pathManager;
}

exports.Reference = Reference;
exports.Variable = Variable;
exports.Scope = Scope;
exports.Path = Path;
exports.ScopeManager = ScopeManager;
exports.PathManager = PathManager;