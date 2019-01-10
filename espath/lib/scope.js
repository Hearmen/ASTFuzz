'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ClassScope = exports.ForScope = exports.FunctionScope = exports.SwitchScope = exports.BlockScope = exports.TDZScope = exports.WithScope = exports.CatchScope = exports.FunctionExpressionNameScope = exports.ModuleScope = exports.GlobalScope = undefined;

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /*
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       Copyright (C) 2015 Yusuke Suzuki <utatane.tea@gmail.com>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       Redistribution and use in source and binary forms, with or without
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       modification, are permitted provided that the following conditions are met:
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         * Redistributions of source code must retain the above copyright
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           notice, this list of conditions and the following disclaimer.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         * Redistributions in binary form must reproduce the above copyright
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           notice, this list of conditions and the following disclaimer in the
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           documentation and/or other materials provided with the distribution.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     */

var _estraverse = require('estraverse');

var _es6Map = require('es6-map');

var _es6Map2 = _interopRequireDefault(_es6Map);

var _reference = require('./reference');

var _reference2 = _interopRequireDefault(_reference);

var _variable = require('./variable');

var _variable2 = _interopRequireDefault(_variable);

var _definition = require('./definition');

var _definition2 = _interopRequireDefault(_definition);

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function isStrictScope(scope, block, isMethodDefinition, useDirective) {
    var body, i, iz, stmt, expr;

    // When upper scope is exists and strict, inner scope is also strict.
    if (scope.upper && scope.upper.isStrict) {
        return true;
    }

    // ArrowFunctionExpression's scope is always strict scope.
    if (block.type === _estraverse.Syntax.ArrowFunctionExpression) {
        return true;
    }

    if (isMethodDefinition) {
        return true;
    }

    if (scope.type === 'class' || scope.type === 'module') {
        return true;
    }

    if (scope.type === 'block' || scope.type === 'switch') {
        return false;
    }

    if (scope.type === 'function') {
        if (block.type === _estraverse.Syntax.Program) {
            body = block;
        } else {
            body = block.body;
        }
    } else if (scope.type === 'global') {
        body = block;
    } else {
        return false;
    }

    // Search 'use strict' directive.
    if (useDirective) {
        for (i = 0, iz = body.body.length; i < iz; ++i) {
            stmt = body.body[i];
            if (stmt.type !== _estraverse.Syntax.DirectiveStatement) {
                break;
            }
            if (stmt.raw === '"use strict"' || stmt.raw === '\'use strict\'') {
                return true;
            }
        }
    } else {
        for (i = 0, iz = body.body.length; i < iz; ++i) {
            stmt = body.body[i];
            if (stmt.type !== _estraverse.Syntax.ExpressionStatement) {
                break;
            }
            expr = stmt.expression;
            if (expr.type !== _estraverse.Syntax.Literal || typeof expr.value !== 'string') {
                break;
            }
            if (expr.raw != null) {
                if (expr.raw === '"use strict"' || expr.raw === '\'use strict\'') {
                    return true;
                }
            } else {
                if (expr.value === 'use strict') {
                    return true;
                }
            }
        }
    }
    return false;
}

function registerScope(scopeManager, scope) {
    var scopes;

    scopeManager.scopes.push(scope);

    scopes = scopeManager.__nodeToScope.get(scope.block);
    if (scopes) {
        scopes.push(scope);
    } else {
        scopeManager.__nodeToScope.set(scope.block, [scope]);
    }
}

function shouldBeStatically(def) {
    return def.type === _variable2.default.ClassName || def.type === _variable2.default.Variable && def.parent.kind !== 'var';
}

/**
 * @class Scope
 */

var Scope = function () {
    function Scope(scopeManager, type, upperScope, block, isMethodDefinition) {
        _classCallCheck(this, Scope);

        /**
         * One of 'TDZ', 'module', 'block', 'switch', 'function', 'catch', 'with', 'function', 'class', 'global'.
         * @member {String} Scope#type
         */
        this.type = type;
        /**
        * The scoped {@link Variable}s of this scope, as <code>{ Variable.name
        * : Variable }</code>.
        * @member {Map} Scope#set
        */
        this.set = new _es6Map2.default();
        /**
         * The tainted variables of this scope, as <code>{ Variable.name :
         * boolean }</code>.
         * @member {Map} Scope#taints */
        this.taints = new _es6Map2.default();
        /**
         * Generally, through the lexical scoping of JS you can always know
         * which variable an identifier in the source code refers to. There are
         * a few exceptions to this rule. With 'global' and 'with' scopes you
         * can only decide at runtime which variable a reference refers to.
         * Moreover, if 'eval()' is used in a scope, it might introduce new
         * bindings in this or its parent scopes.
         * All those scopes are considered 'dynamic'.
         * @member {boolean} Scope#dynamic
         */
        this.dynamic = this.type === 'global' || this.type === 'with';
        /**
         * A reference to the scope-defining syntax node.
         * @member {esprima.Node} Scope#block
         */
        this.block = block;
        /**
        * The {@link Reference|references} that are not resolved with this scope.
        * @member {Reference[]} Scope#through
        */
        this.through = [];
        /**
        * The scoped {@link Variable}s of this scope. In the case of a
        * 'function' scope this includes the automatic argument <em>arguments</em> as
        * its first element, as well as all further formal arguments.
        * @member {Variable[]} Scope#variables
        */
        this.variables = [];
        /**
        * Any variable {@link Reference|reference} found in this scope. This
        * includes occurrences of local variables as well as variables from
        * parent scopes (including the global scope). For local variables
        * this also includes defining occurrences (like in a 'var' statement).
        * In a 'function' scope this does not include the occurrences of the
        * formal parameter in the parameter list.
        * @member {Reference[]} Scope#references
        */
        this.references = [];

        /**
        * For 'global' and 'function' scopes, this is a self-reference. For
        * other scope types this is the <em>variableScope</em> value of the
        * parent scope.
        * @member {Scope} Scope#variableScope
        */
        this.variableScope = this.type === 'global' || this.type === 'function' || this.type === 'module' ? this : upperScope.variableScope;
        /**
        * Whether this scope is created by a FunctionExpression.
        * @member {boolean} Scope#functionExpressionScope
        */
        this.functionExpressionScope = false;
        /**
        * Whether this is a scope that contains an 'eval()' invocation.
        * @member {boolean} Scope#directCallToEvalScope
        */
        this.directCallToEvalScope = false;
        /**
        * @member {boolean} Scope#thisFound
        */
        this.thisFound = false;

        this.__left = [];

        /**
        * Reference to the parent {@link Scope|scope}.
        * @member {Scope} Scope#upper
        */
        this.upper = upperScope;
        /**
        * Whether 'use strict' is in effect in this scope.
        * @member {boolean} Scope#isStrict
        */
        //this.isStrict = isStrictScope(this, block, isMethodDefinition, scopeManager.__useDirective());
        this.isStatic = false;

        /**
        * List of nested {@link Scope}s.
        * @member {Scope[]} Scope#childScopes
        */
        this.childScopes = [];
        if (this.upper) {
            this.upper.childScopes.push(this);
        }

        this.__declaredVariables = scopeManager.__declaredVariables;

        registerScope(scopeManager, this);
    }

    _createClass(Scope, [{
        key: '__shouldStaticallyClose',
        value: function __shouldStaticallyClose(scopeManager) {
            return !this.dynamic || scopeManager.__isOptimistic();
        }
    }, {
        key: '__shouldStaticallyCloseForGlobal',
        value: function __shouldStaticallyCloseForGlobal(ref) {
            // On global scope, let/const/class declarations should be resolved statically.
            var name = ref.identifier.name;
            if (!this.set.has(name)) {
                return false;
            }

            var variable = this.set.get(name);
            var defs = variable.defs;
            return defs.length > 0 && defs.every(shouldBeStatically);
        }
    }, {
        key: '__staticCloseRef',
        value: function __staticCloseRef(ref) {
            if (!this.__resolve(ref)) {
                this.__delegateToUpperScope(ref);
            }
        }
    }, {
        key: '__dynamicCloseRef',
        value: function __dynamicCloseRef(ref) {
            // notify all names are through to global
            var current = this;
            do {
                current.through.push(ref);
                current = current.upper;
            } while (current);
        }
    }, {
        key: '__globalCloseRef',
        value: function __globalCloseRef(ref) {
            // let/const/class declarations should be resolved statically.
            // others should be resolved dynamically.
            if (this.__shouldStaticallyCloseForGlobal(ref)) {
                this.__staticCloseRef(ref);
            } else {
                this.__dynamicCloseRef(ref);
            }
        }
    }, {
        key: '__close',
        value: function __close(scopeManager) {
            var closeRef;
            if (this.__shouldStaticallyClose(scopeManager)) {
                closeRef = this.__staticCloseRef;
            } else if (this.type !== 'global') {
                closeRef = this.__dynamicCloseRef;
            } else {
                closeRef = this.__globalCloseRef;
            }

            // Try Resolving all references in this scope.
            // for (var i = 0, iz = this.__left.length; i < iz; ++i) {
            //     var ref = this.__left[i];
            //     closeRef.call(this, ref);
            // }
            // this.__left = null;

            return this.upper;
        }
    }, {
        key: '__resolve',
        value: function __resolve(ref) {
            var variable, name;
            name = ref.identifier.name;
            if (this.set.has(name)) {
                variable = this.set.get(name);
                variable.references.push(ref);
                variable.stack = variable.stack && ref.from.variableScope === this.variableScope;
                if (ref.tainted) {
                    variable.tainted = true;
                    this.taints.set(variable.name, true);
                }
                ref.resolved = variable;
                return true;
            }
            return false;
        }
    }, {
        key: '__delegateToUpperScope',
        value: function __delegateToUpperScope(ref) {
            if (this.upper) {
                // this.upper.__left.push(ref);
            }
            this.through.push(ref);
        }
    }, {
        key: '__addDeclaredVariablesOfNode',
        value: function __addDeclaredVariablesOfNode(variable, node) {
            if (node == null) {
                return;
            }

            var variables = this.__declaredVariables.get(node);
            if (variables == null) {
                variables = [];
                this.__declaredVariables.set(node, variables);
            }
            if (variables.indexOf(variable) === -1) {
                variables.push(variable);
            }
        }
    }, {
        key: '__defineGeneric',
        value: function __defineGeneric(name, set, variables, node, def) {
            var variable;

            variable = set.get(name);
            if (!variable) {
                variable = new _variable2.default(name, this);
                set.set(name, variable);
                variables.push(variable);
            }

            if (def) {
                variable.defs.push(def);
                if (def.type !== _variable2.default.TDZ) {
                    this.__addDeclaredVariablesOfNode(variable, def.node);
                    this.__addDeclaredVariablesOfNode(variable, def.parent);
                }
            }
            if (node) {
                variable.identifiers.push(node);
            }
        }
    }, {
        key: '__define',
        value: function __define(node, def) {
            if (node && node.type === _estraverse.Syntax.Identifier) {
                this.__defineGeneric(node.name, this.set, this.variables, node, def);
            }
        }
    }, {
        key: '__referencing',
        value: function __referencing(node, assign, writeExpr, maybeImplicitGlobal, partial, init) {
            // because Array element may be null
            if (!node || node.type !== _estraverse.Syntax.Identifier) {
                return;
            }

            // Specially handle like `this`.
            if (node.name === 'super') {
                return;
            }

            var ref = new _reference2.default(node, this, assign || _reference2.default.READ, writeExpr, maybeImplicitGlobal, !!partial, !!init);
            this.references.push(ref);
            // this.__left.push(ref);
        }
    }, {
        key: '__detectEval',
        value: function __detectEval() {
            var current;
            current = this;
            this.directCallToEvalScope = true;
            do {
                current.dynamic = true;
                current = current.upper;
            } while (current);
        }
    }, {
        key: '__detectThis',
        value: function __detectThis() {
            this.thisFound = true;
        }
    }, {
        key: '__isClosed',
        value: function __isClosed() {
            return this.__left === null;
        }

        /**
         * returns resolved {Reference}
         * @method Scope#resolve
         * @param {Esprima.Identifier} ident - identifier to be resolved.
         * @return {Reference}
         */

    }, {
        key: 'resolve',
        value: function resolve(ident) {
            var ref, i, iz;
            (0, _assert2.default)(this.__isClosed(), 'Scope should be closed.');
            (0, _assert2.default)(ident.type === _estraverse.Syntax.Identifier, 'Target should be identifier.');
            for (i = 0, iz = this.references.length; i < iz; ++i) {
                ref = this.references[i];
                if (ref.identifier === ident) {
                    return ref;
                }
            }
            return null;
        }

        /**
         * returns this scope is static
         * @method Scope#isStatic
         * @return {boolean}
         */

    }, {
        key: 'isStatic',
        value: function isStatic() {
            return !this.dynamic;
        }

        /**
         * returns this scope has materialized arguments
         * @method Scope#isArgumentsMaterialized
         * @return {boolean}
         */

    }, {
        key: 'isArgumentsMaterialized',
        value: function isArgumentsMaterialized() {
            return true;
        }

        /**
         * returns this scope has materialized `this` reference
         * @method Scope#isThisMaterialized
         * @return {boolean}
         */

    }, {
        key: 'isThisMaterialized',
        value: function isThisMaterialized() {
            return true;
        }
    }, {
        key: 'isUsedName',
        value: function isUsedName(name) {
            if (this.set.has(name)) {
                return true;
            }
            for (var i = 0, iz = this.through.length; i < iz; ++i) {
                if (this.through[i].identifier.name === name) {
                    return true;
                }
            }
            return false;
        }
    }]);

    return Scope;
}();

exports.default = Scope;

var GlobalScope = exports.GlobalScope = function (_Scope) {
    _inherits(GlobalScope, _Scope);

    function GlobalScope(scopeManager, block) {
        _classCallCheck(this, GlobalScope);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(GlobalScope).call(this, scopeManager, 'global', null, block, false));

        _this.implicit = {
            set: new _es6Map2.default(),
            variables: [],
            /**
            * List of {@link Reference}s that are left to be resolved (i.e. which
            * need to be linked to the variable they refer to).
            * @member {Reference[]} Scope#implicit#left
            */
            left: []
        };
        return _this;
    }

    _createClass(GlobalScope, [{
        key: '__close',
        value: function __close(scopeManager) {
            var implicit = [];
            for (var i = 0, iz = this.__left.length; i < iz; ++i) {
                var ref = this.__left[i];
                if (ref.__maybeImplicitGlobal && !this.set.has(ref.identifier.name)) {
                    implicit.push(ref.__maybeImplicitGlobal);
                }
            }

            // create an implicit global variable from assignment expression
            for (var _i = 0, _iz = implicit.length; _i < _iz; ++_i) {
                var info = implicit[_i];
                this.__defineImplicit(info.pattern, new _definition2.default(_variable2.default.ImplicitGlobalVariable, info.pattern, info.node, null, null, null));
            }

            this.implicit.left = this.__left;

            return _get(Object.getPrototypeOf(GlobalScope.prototype), '__close', this).call(this, scopeManager);
        }
    }, {
        key: '__defineImplicit',
        value: function __defineImplicit(node, def) {
            if (node && node.type === _estraverse.Syntax.Identifier) {
                this.__defineGeneric(node.name, this.implicit.set, this.implicit.variables, node, def);
            }
        }
    }]);

    return GlobalScope;
}(Scope);

var ModuleScope = exports.ModuleScope = function (_Scope2) {
    _inherits(ModuleScope, _Scope2);

    function ModuleScope(scopeManager, upperScope, block) {
        _classCallCheck(this, ModuleScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ModuleScope).call(this, scopeManager, 'module', upperScope, block, false));
    }

    return ModuleScope;
}(Scope);

var FunctionExpressionNameScope = exports.FunctionExpressionNameScope = function (_Scope3) {
    _inherits(FunctionExpressionNameScope, _Scope3);

    function FunctionExpressionNameScope(scopeManager, upperScope, block) {
        _classCallCheck(this, FunctionExpressionNameScope);

        var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(FunctionExpressionNameScope).call(this, scopeManager, 'function-expression-name', upperScope, block, false));

        _this3.__define(block.id, new _definition2.default(_variable2.default.FunctionName, block.id, block, null, null, null));
        _this3.functionExpressionScope = true;
        return _this3;
    }

    return FunctionExpressionNameScope;
}(Scope);

var CatchScope = exports.CatchScope = function (_Scope4) {
    _inherits(CatchScope, _Scope4);

    function CatchScope(scopeManager, upperScope, block) {
        _classCallCheck(this, CatchScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(CatchScope).call(this, scopeManager, 'catch', upperScope, block, false));
    }

    return CatchScope;
}(Scope);

var WithScope = exports.WithScope = function (_Scope5) {
    _inherits(WithScope, _Scope5);

    function WithScope(scopeManager, upperScope, block) {
        _classCallCheck(this, WithScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(WithScope).call(this, scopeManager, 'with', upperScope, block, false));
    }

    _createClass(WithScope, [{
        key: '__close',
        value: function __close(scopeManager) {
            if (this.__shouldStaticallyClose(scopeManager)) {
                return _get(Object.getPrototypeOf(WithScope.prototype), '__close', this).call(this, scopeManager);
            }

            for (var i = 0, iz = this.__left.length; i < iz; ++i) {
                var ref = this.__left[i];
                ref.tainted = true;
                this.__delegateToUpperScope(ref);
            }
            this.__left = null;

            return this.upper;
        }
    }]);

    return WithScope;
}(Scope);

var TDZScope = exports.TDZScope = function (_Scope6) {
    _inherits(TDZScope, _Scope6);

    function TDZScope(scopeManager, upperScope, block) {
        _classCallCheck(this, TDZScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(TDZScope).call(this, scopeManager, 'TDZ', upperScope, block, false));
    }

    return TDZScope;
}(Scope);

var BlockScope = exports.BlockScope = function (_Scope7) {
    _inherits(BlockScope, _Scope7);

    function BlockScope(scopeManager, upperScope, block) {
        _classCallCheck(this, BlockScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(BlockScope).call(this, scopeManager, 'block', upperScope, block, false));
    }

    return BlockScope;
}(Scope);

var SwitchScope = exports.SwitchScope = function (_Scope8) {
    _inherits(SwitchScope, _Scope8);

    function SwitchScope(scopeManager, upperScope, block) {
        _classCallCheck(this, SwitchScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(SwitchScope).call(this, scopeManager, 'switch', upperScope, block, false));
    }

    return SwitchScope;
}(Scope);

var FunctionScope = exports.FunctionScope = function (_Scope9) {
    _inherits(FunctionScope, _Scope9);

    function FunctionScope(scopeManager, upperScope, block, isMethodDefinition) {
        _classCallCheck(this, FunctionScope);

        // section 9.2.13, FunctionDeclarationInstantiation.
        // NOTE Arrow functions never have an arguments objects.

        var _this9 = _possibleConstructorReturn(this, Object.getPrototypeOf(FunctionScope).call(this, scopeManager, 'function', upperScope, block, isMethodDefinition));

        if (_this9.block.type !== _estraverse.Syntax.ArrowFunctionExpression) {
            _this9.__defineArguments();
        }
        return _this9;
    }

    _createClass(FunctionScope, [{
        key: 'isArgumentsMaterialized',
        value: function isArgumentsMaterialized() {
            // TODO(Constellation)
            // We can more aggressive on this condition like this.
            //
            // function t() {
            //     // arguments of t is always hidden.
            //     function arguments() {
            //     }
            // }
            if (this.block.type === _estraverse.Syntax.ArrowFunctionExpression) {
                return false;
            }

            if (!this.isStatic()) {
                return true;
            }

            var variable = this.set.get('arguments');
            (0, _assert2.default)(variable, 'Always have arguments variable.');
            return variable.tainted || variable.references.length !== 0;
        }
    }, {
        key: 'isThisMaterialized',
        value: function isThisMaterialized() {
            if (!this.isStatic()) {
                return true;
            }
            return this.thisFound;
        }
    }, {
        key: '__defineArguments',
        value: function __defineArguments() {
            this.__defineGeneric('arguments', this.set, this.variables, null, null);
            this.taints.set('arguments', true);
        }
    }]);

    return FunctionScope;
}(Scope);

var ForScope = exports.ForScope = function (_Scope10) {
    _inherits(ForScope, _Scope10);

    function ForScope(scopeManager, upperScope, block) {
        _classCallCheck(this, ForScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ForScope).call(this, scopeManager, 'for', upperScope, block, false));
    }

    return ForScope;
}(Scope);

var ClassScope = exports.ClassScope = function (_Scope11) {
    _inherits(ClassScope, _Scope11);

    function ClassScope(scopeManager, upperScope, block) {
        _classCallCheck(this, ClassScope);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(ClassScope).call(this, scopeManager, 'class', upperScope, block, false));
    }

    return ClassScope;
}(Scope);

