(function () {
    'use strict';

    var estraverse = require('estraverse');

    function isNode(node) {
        if (node == null) {
            return false;
        }
        return typeof node === 'object' && typeof node.type === 'string';
    }

    function isProperty(nodeType, key) {
        return (nodeType === estraverse.Syntax.ObjectExpression || nodeType === estraverse.Syntax.ObjectPattern) && key === 'properties';
    }

    function Visitor(visitor, options) {
        options = options || {};

        this.__visitor = visitor ||  this;
        this.__childVisitorKeys = options.childVisitorKeys
            ? Object.assign({}, estraverse.VisitorKeys, options.childVisitorKeys)
            : estraverse.VisitorKeys;
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
    Visitor.prototype.visitChildren = function (node) {
        var type, children, i, iz, j, jz, child;

        if (node == null) {
            return;
        }

        type = node.type || estraverse.Syntax.Property;

        children = this.__childVisitorKeys[type];
        if (!children) {
            if (this.__fallback) {
                children = this.__fallback(node);
            } else {
                throw new Error('Unknown node type ' + type + '.');
            }
        }

        for (i = 0, iz = children.length; i < iz; ++i) {
            child = node[children[i]];
            if (child) {
                if (Array.isArray(child)) {
                    for (j = 0, jz = child.length; j < jz; ++j) {
                        if (child[j]) {
                            if (isNode(child[j]) || isProperty(type, children[i])) {
                                this.visit(child[j]);
                            }
                        }
                    }
                } else if (isNode(child)) {
                    this.visit(child);
                }
            }
        }
    };

    /* Dispatching node. */
    Visitor.prototype.visit = function (node, parent, pred) {
        var type;

        if (node == null) {
            return;
        }

        type = node.type || estraverse.Syntax.Property;
        if (this.__visitor[type]) {
            this.__visitor[type].call(this, node, parent, pred);
            return;
        }
        this.visitChildren(node, parent, pred);
    };

    exports.Visitor = Visitor;
    exports.visit = function (node, visitor, options) {
        var v = new Visitor(visitor, options);
        v.visit(node);
    };
}());
/* vim: set sw=4 ts=4 et tw=80 : */
