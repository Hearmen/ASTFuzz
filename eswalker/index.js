
exports.analyze = analyze;


var ScopeManager = require('./scope-manager').default;
var PathManager = require('./path-manager');
var Referencer = require('./referencer');
var Reference = require('./reference').default;
var Variable = require('./variable');
var Scope = require('./scope');
var Path = require('./path');
var estraverse = require('estraverse');

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

function eliminateNode(tree, pathManager, scopeManager){
    estraverse.traverse(tree, {
        enter: function(node, parent) {
        },
        leave: function(node, parent) {
            if(/Assignment/.test(node.type) && node.left.value == 0x10ad){
                mutateSize = 20;
            }
            if(/VariableDeclarator/.test(node.type)){
                var currentPath = pathManager.acquire(node);
                if(currentPath){
                    var currentScope = currentPath.scope;
                    currentScope.__delete(node.id);
                }
            }      
            if(/CatchClause/.test(node.type)){
                var currentPath = pathManager.acquire(node);
                if(currentPath){
                    var currentScope = currentPath.scope;
                    currentScope.__delete(node.param);
                }
            }
            if(/Function/.test(node.type)){
                var currentPath = pathManager.acquire(node);
                if(currentPath){
                    var currentScope = currentPath.scope;
                    currentScope.__delete(node.id);
                    for(let i=0;i<node.params.length;i++){
                        currentScope.__delete(node.params[i].id);
                    }
                    if (node.rest) {
                        currentScope.__delete(node.rest);
                    }
                }
            }
            if(/Class/.test(node.type)){
                var currentPath = pathManager.acquire(node);
                if(currentPath){
                    var currentScope = currentPath.scope;
                    currentScope.__delete(node.id);
                }
            }
        }
    });
}

exports.Reference = Reference;
exports.Variable = Variable;
exports.Scope = Scope;
exports.Path = Path;
exports.ScopeManager = ScopeManager;
exports.PathManager = PathManager;