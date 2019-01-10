var Builder = require('./jsbuilder').default;
var random = require('./random');

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; }; 


function defaultOptions() {
    return {
        state: {
            depth: 10,
            globalCount: 0,
            varCount: 0,
            letCount: 0,
            constCount: 0,
            paramCount: 0,
            labelCount: 0,
            propCount: 0,
            funcCount: 0,
            classCount: 0
        },
        directive: false,
        nodejsScope: false,
        impliedStrict: false,
        sourceType: 'script', // one of ['script', 'module']
        ecmaVersion: 5,
        childVisitorKeys: null,
        fallback: 'iteration'
    };
}

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


function generate(tree, providedOptions, scopeManager, pathManager) {
    var pathManager,scopeManager, builder, options;

    options = updateDeeply(defaultOptions(), providedOptions);

    builder = new Builder(options, scopeManager, pathManager);
    var tree = builder.build("Program");

    return tree;
}

/**
 * 
 * @param {ast tree} tree 
 * @param {options} providedOptions 
 * @param {*} scopeManager 
 * @param {*} pathManager 
 * @param {Expression,Statement,Literal, Operator} type 
 */

function isLHSPattern(pathManager , node){
    var pathVisitor = pathManager.acquire(node);

    if(pathVisitor.parent){
        switch(pathVisitor.parent.type){
            case 'UpdateExpression':
                return true;
                break;
            case 'ArrayPattern':
                return true;
                break;
            case 'AssignmentExpression':
                if(pathVisitor.parent.left == node)
                    return true;
                break;
            case 'AssignmentPattern':
                if(pathVisitor.parent.left == node)
                    return true;
                break;
        }
    }
}

function mutate(tree, providedOptions, scopeManager, pathManager, node) {
    var builder, options, shadow;

    options = updateDeeply(defaultOptions(), providedOptions);

    var currentPath = pathManager.acquire(node);
    if(!currentPath){
        console.log(node);
        return node;
    }
    pathManager.__currentPath = currentPath;
    scopeManager.__currentScope = currentPath.scope;

    builder = new Builder(options, scopeManager, pathManager);

    switch(node.type){
        case "ArrayExpression":
        case "AwaitExpression":
        case "AssignmentExpression":
        case "BinaryExpression":
        case "CallExpression":
        case "ConditionalExpression":
        case "FunctionExpression":
        case "LogicalExpression":
        case "MemberExpression":
        case "NewExpression":
        case "ObjectExpression":
        case "SequenceExpression":
        case "ThisExpression":
        case "UnaryExpression":
        case "UpdateExpression":
        case "YieldExpression":
        case "ArrowFunctionExpression":
        case "ClassExpression":
        case "ArgumentsToken":
        case "SpreadElement":
            if(isLHSPattern(pathManager, node))
                shadow = builder.build("LHSPattern", currentPath.parent, currentPath.predcessor)
            else
                //shadow = builder.build("Expression",node,node);
                shadow = node;
            break;
        case "MetaProperty":
        case "BlockStatement":
        case "BreakStatement":
        case "ContinueStatement":
        case "DoWhileStatement":
        case "EmptyStatement":
        case "ExpressionStatement":
        case "ForInStatement":
        case "ForOfStatement":
        //case "FunctionDeclaration":
        case "IfStatement":
        case "LabeledStatement":
        case "ReturnStatement":
        case "SwitchStatement":
        case "ThrowStatement":
        case "TryStatement":
        case "VariableDeclaration":
        case "WhileStatement":
        //case "ClassDeclaration":
        case "WithStatement":
            if(random.randomBool(0.8)){
                if(random.randomBool(0.3)){
                    shadow = builder.build("TryStatement",currentPath.parent, currentPath.predcessor);
                    shadow.block.body.push(node);
                }else{
                    shadow = builder.build("BlockStatement",currentPath.parent, currentPath.predcessor);
                    shadow.body.push(node);
                }
            }else{
                shadow = builder.build("Statement",currentPath.parent, currentPath.predcessor);
            }
            break;
        case "Literal":
            shadow = builder.build("Literal",currentPath.parent, currentPath.predcessor);
            break;
        case "Operator":
            shadow = builder.build("Operator",currentPath.parent, currentPath.predcessor);
            break;
        default:
            shadow = node;
            break;
    }

    shadow.mutated = true;
    return shadow;
}

exports.generate = generate;
exports.mutate = mutate;