(function () {
    'use strict';

    var estraverse = require('estraverse');
    var Node = require('../nodes');
    var cache$ = require('../random');

    var randomBool = cache$.randomBool;
    var randomElement = cache$.randomElement;

    /**
     * 
     * util functions
     */
    function oneOf(possible) {
        return randomElement(possible);
    };



    function isNode(node) {
        if (node == null) {
            return false;
        }
        return typeof node === 'object' && typeof node.type === 'string';
    }

    function isProperty(nodeType, key) {
        return (nodeType === estraverse.Syntax.ObjectExpression || nodeType === estraverse.Syntax.ObjectPattern) && key === 'properties';
    }

    var BuilderKeys = {
        AssignmentExpression: ['left', 'right'],
        AssignmentPattern: ['left', 'right'],
        ArrayExpression: ['elements'],
        ArrayPattern: ['elements'],
        ArrowFunctionExpression: ['params', 'body'],
        AwaitExpression: ['argument'], // CAUTION: It's deferred to ES7.
        BlockStatement: ['body'],
        BinaryExpression: ['left', 'right'],
        BreakStatement: ['label'],
        CallExpression: ['callee', 'arguments'],
        CatchClause: ['param', 'body'],
        ClassBody: ['body'],
        ClassDeclaration: ['id', 'superClass', 'body'],
        ClassExpression: ['id', 'superClass', 'body'],
        ComprehensionBlock: ['left', 'right'],  // CAUTION: It's deferred to ES7.
        ComprehensionExpression: ['blocks', 'filter', 'body'],  // CAUTION: It's deferred to ES7.
        ConditionalExpression: ['test', 'consequent', 'alternate'],
        ContinueStatement: ['label'],
        DebuggerStatement: [],
        DirectiveStatement: [],
        DoWhileStatement: ['body', 'test'],
        EmptyStatement: [],
        ExportAllDeclaration: ['source'],
        ExportDefaultDeclaration: ['declaration'],
        ExportNamedDeclaration: ['declaration', 'specifiers', 'source'],
        ExportSpecifier: ['exported', 'local'],
        ExpressionStatement: ['expression'],
        ForStatement: ['init', 'test', 'update', 'body'],
        ForInStatement: ['left', 'right', 'body'],
        ForOfStatement: ['left', 'right', 'body'],
        FunctionDeclaration: ['id', 'params', 'body'],
        FunctionExpression: ['id', 'params', 'body'],
        GeneratorExpression: ['blocks', 'filter', 'body'],  // CAUTION: It's deferred to ES7.
        Identifier: [],
        IfStatement: ['test', 'consequent', 'alternate'],
        ImportDeclaration: ['specifiers', 'source'],
        ImportDefaultSpecifier: ['local'],
        ImportNamespaceSpecifier: ['local'],
        ImportSpecifier: ['imported', 'local'],
        Literal: [],
        LabeledStatement: ['label', 'body'],
        LogicalExpression: ['left', 'right'],
        MemberExpression: ['object', 'property'],
        MetaProperty: ['meta', 'property'],
        MethodDefinition: ['key', 'value'],
        ModuleSpecifier: [],
        NewExpression: ['callee', 'arguments'],
        ObjectExpression: ['properties'],
        ObjectPattern: ['properties'],
        Program: ['body'],
        Property: ['key', 'value'],
        RestElement: [ 'argument' ],
        ReturnStatement: ['argument'],
        SequenceExpression: ['expressions'],
        SpreadElement: ['argument'],
        Super: [],
        SwitchStatement: ['discriminant', 'cases'],
        SwitchCase: ['test', 'consequent'],
        TaggedTemplateExpression: ['tag', 'quasi'],
        TemplateElement: [],
        TemplateLiteral: ['quasis', 'expressions'],
        ThisExpression: [],
        ThrowStatement: ['argument'],
        TryStatement: ['block', 'handler', 'finalizer'],
        UnaryExpression: ['argument'],
        UpdateExpression: ['argument'],
        VariableDeclaration: ['declarations'],
        VariableDeclarator: ['id', 'init'],
        WhileStatement: ['test', 'body'],
        WithStatement: ['object', 'body'],
        YieldExpression: ['argument']
    };

    function Builder(builder, options){
        options = options || {};

        this.__builder = builder ||  this;
        this.__childBuilderKeys = options.childBuilderKeys
            ? Object.assign({}, estraverse.BuilderKeys, options.childBuilderKeys)
            : BuilderKeys;
        if (options.fallback === 'iteration') {
            this.__fallback = Object.keys;
        } else if (typeof options.fallback === 'function') {
            this.__fallback = options.fallback;
        }
    }

    /* Default method for visiting children.
     * When you need to call default visiting operation inside custom visiting
     * operation, you can use it with `this.visitChildren(node)`.
     */
    Builder.prototype.buildChildren = function (node,nodeType, parent, pred) {
        var type, children, i, iz, j, jz, child, node;

        if (nodeType == null) {
            return;
        }

        type = nodeType;

        children = this.__childBuilderKeys[type];
        if (!children) {
            throw new Error('Unknown node type ' + type + '.');
        }

        for (i = 0, iz = children.length; i < iz; ++i) {
            childKey = children[i];
            node[childKey] = this.build(childKey, parent, pred);
        }
        return node;
    };

    Builder.prototype.buildListExact= function (min,possibleNodeTypes, parent, pred){
        var list = [];
        var node = null;
        var predNode = pred;
        for(let i =0; i<min; i++)
        {
            node = this.build(oneOf(possibleNodeTypes), parent, predNode);
            list.push(node);
            predNode = node;
        }
        return list;
    }

    Builder.prototype.buildList = function (min,possibleNodeTypes, parent, pred){
        var list = [];
        var node = null;
        var predNode = pred;
        for(let i =0; i<min; i++)
        {
            node = this.build(oneOf(possibleNodeTypes), parent, predNode);
            list.push(node);
            predNode = node;

        }
        while (Math.random() < .6) {
            node = this.build(oneOf(possibleNodeTypes), parent, predNode);
            list.push(node);
            predNode = node;
        }
        return list;
    }

    /* Dispatching node. */
    Builder.prototype.build = function (nodeType, parent, pred) {
        if(nodeType == null)
            return null;
        var node = new Node();
        if (this.__builder[nodeType]) {
            this.__builder[nodeType].call(this, node, parent, pred);
        }
        node.mutated = true;
        return node;
    };

    exports.BuilderKeys = BuilderKeys;
    exports.Builder = Builder;
    exports.build = function (nodeType, builder, options) {
        var v = new Builder(builder, options);
        return v.build(nodeType);
    };
}());
/* vim: set sw=4 ts=4 et tw=80 : */
