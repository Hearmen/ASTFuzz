var esrecurse = require('esrecurse');
var estraverse = require('estraverse');
var variable = require('./variable');
var reference = require('./reference')

var definition = require('./definition');
var PatternVisitor = require('./pattern-visitor').default;

function traverseIdentifierInPattern(options, rootPattern, referencer, callback) {
    // Call the callback at left hand identifier nodes, and Collect right hand nodes.
    var visitor = new PatternVisitor(options, rootPattern, callback);
    visitor.visit(rootPattern);

    // Process the right hand nodes recursively.
    if (referencer != null) {
        visitor.rightHandNodes.forEach(referencer.visit, referencer);
    }
}


class Referencer extends esrecurse.Visitor{
    constructor(options, scopeManager, pathManager) {
        super(null, options);
        this.options = options;
        this.scopeManager = scopeManager;
        this.pathManager = pathManager;
        this.ancestors = [];
        this.predcessor = null;
        this.isInnerMethodDefinition = false;
    }


    /**
     * copied from escope
     */
    currentScope(){
        return this.scopeManager.__currentScope;
    }

    globalScope(){
        return this.scopeManager.globalScope;
    }

    close(node){
        while (this.currentScope() && node === this.currentScope().block) {
            this.scopeManager.__currentScope = this.currentScope().__close(this.scopeManager);
        }
    }

    pushInnerMethodDefinition(isInnerMethodDefinition){
        var previous = this.isInnerMethodDefinition;
        this.isInnerMethodDefinition = isInnerMethodDefinition;
        return previous;
    }

    popInnerMethodDefinition(isInnerMethodDefinition) {
        this.isInnerMethodDefinition = isInnerMethodDefinition;
    }

    /* for-in */
    materializeTDZScope(node, iterationNode) {
        // update current scope to a deeper TDZScope
        this.scopeManager.__nestTDZScope(node, iterationNode);
        this.visitVariableDeclaration(this.currentScope(), variable.TDZ, iterationNode.left, 0, true);
    }

    materializeIterationScope(node) {
        var _this4 = this;

        // Generate iteration scope for upper ForIn/ForOf Statements.
        var letOrConstDecl;
        this.scopeManager.__nestForScope(node);
        letOrConstDecl = node.left;
        this.visitVariableDeclaration(this.currentScope(), variable, letOrConstDecl, 0);
        this.visitPattern(letOrConstDecl.declarations[0].id, function (pattern) {
            _this4.currentScope().__referencing(pattern, reference.WRITE, node.right, null, true, true);
        });
    }

    referencingDefaultValue(pattern, assignments, maybeImplicitGlobal, init) {
        var scope = this.currentScope();
        assignments.forEach(function (assignment) {
            scope.__referencing(pattern, reference.WRITE, assignment.right, maybeImplicitGlobal, pattern !== assignment.left, init);
        });
    }

    currentVariables(){
        let currentVaribles = [];
        let scopeVisitor = this.currentScope();
        while(scopeVisitor){
            for(varible of scopeVisitor.variables){
                currentVaribles.push(varible.name);
            }
            scopeVisitor = scopeVisitor.upper;
        }
        return currentVaribles;
    }

    alreadyInCurrentScope(name){
        for(variable of this.currentVariables()){
            if(name == variable){
                return true;
            }
        }
        return false;
    }

    visitPattern(node, options, callback) {
        this.ancestors.push(this.currentPath());
        this.pathManager.__stepPattern(node, this.currentScope(), this.currentParent());
        if (typeof options === 'function') {
            callback = options;
            options = { processRightHandNodes: false };
        }
        traverseIdentifierInPattern(this.options, node, options.processRightHandNodes ? this : null, callback);
        this.visitChildren(node);
        this.ancestors.pop();
    }

    visitFunction(node) {
        this.pathManager.__stepFunction(node, this.currentScope(), this.currentParent());

        this.ancestors.push(this.currentPath());
        var _this5 = this;

        var i, iz;
        // FunctionDeclaration name is defined in upper scope
        // NOTE: Not referring variableScope. It is intended.
        // Since
        //  in ES5, FunctionDeclaration should be in FunctionBody.
        //  in ES6, FunctionDeclaration should be block scoped.
        if (node.type === estraverse.Syntax.FunctionDeclaration) {
            // id is defined in upper scope
            this.currentScope().__define(node.id, new definition.Definition(variable.FunctionName, node.id, node, null, null, 'func'));
        }

        // FunctionExpression with name creates its special scope;
        // FunctionExpressionNameScope.
        if (node.type === estraverse.Syntax.FunctionExpression && node.id) {
            this.scopeManager.__nestFunctionExpressionNameScope(node);
        }

        this.visit(node.id);
        // Consider this function is in the MethodDefinition.
        this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);

        // Process parameter declarations.
        for (i = 0, iz = node.params.length; i < iz; ++i) {
            this.visitPattern(node.params[i], { processRightHandNodes: true }, function (pattern, info) {
                _this5.currentScope().__define(pattern, new definition.ParameterDefinition(pattern, node, i, info.rest));

                _this5.referencingDefaultValue(pattern, info.assignments, null, true);
            });
        }

        // if there's a rest argument, add that
        if (node.rest) {
            this.visitPattern({
                type: 'RestElement',
                argument: node.rest
            }, function (pattern) {
                _this5.currentScope().__define(pattern, new definition.ParameterDefinition(pattern, node, node.params.length, true));
            });
        }

        // Skip BlockStatement to prevent creating BlockStatement scope.
        if (node.body.type === estraverse.Syntax.BlockStatement) {
            this.visitChildren(node.body);
        } else {
            this.visit(node.body);
        }
        this.ancestors.pop();
        //this.exit(node);
        this.close(node);
    }

    visitClass(node) {
        this.pathManager.__stepClass(node,this.currentScope(), this.currentParent())

        this.ancestors.push(this.currentPath());
        if (node.type === estraverse.Syntax.ClassDeclaration) {
            this.currentScope().__define(node.id, new definition.Definition(variable.ClassName, node.id, node, null, null, 'class'));
        }
        
        this.visit(node.id);
        // FIXME: Maybe consider TDZ.
        this.visit(node.superClass);

        this.scopeManager.__nestClassScope(node);

        if (node.id) {
            this.currentScope().__define(node.id, new definition.Definition(variable.ClassName, node.id, node));
        }

        this.visit(node.body);
        this.ancestors.pop();

        //this.exit(node);
        this.close(node);
    }

    visitProperty(node) {
        var previous, isMethodDefinition;

        this.ancestors.push(this.currentPath());
        //if (node.computed) {
            this.visit(node.key);
        //}

        isMethodDefinition = node.type === estraverse.Syntax.MethodDefinition;
        if (isMethodDefinition) {
            previous = this.pushInnerMethodDefinition(true);
        }
        this.visit(node.value);
        if (isMethodDefinition) {
            this.popInnerMethodDefinition(previous);
        }

        this.ancestors.pop();
    }

    visitForIn(node) {
        // TODO
        // consider the situation 
        //for(lll1 of [0]){
        //    1+2;
        //  }
        //
        this.pathManager.__stepForIn(node, this.currentScope(), this.currentParent());

        this.ancestors.push(this.currentPath());
        var _this6 = this;

        if (node.left.type === estraverse.Syntax.VariableDeclaration && node.left.kind !== 'var') {
            //this.pathManager.__stepForIn(node.right, this.currentScope(), this.currentParent());
            //ancestors.push(this.currentPath());
            this.materializeTDZScope(node.right, node);
            this.visit(node.right);
            //ancestors.pop();
            //this.exit(node.right);
            this.close(node.right);

            // left value of forin only avaliable in it's scope
            //this.pathManager.__stepForIn(node, this.currentScope(), this.currentParent());
            //ancestors.push(this.currentPath());
            this.materializeIterationScope(node);
            this.visit(node.left);
            this.visit(node.body);
            //ancestors.pop();
            //this.exit(node);
            this.close(node);
        } else {
            if (node.left.type === estraverse.Syntax.VariableDeclaration) {
                this.visit(node.left);
                this.visitPattern(node.left.declarations[0].id, function (pattern) {
                    _this6.currentScope().__referencing(pattern, reference.WRITE, node.right, null, true, true);
                });
            } else {
                this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                    var maybeImplicitGlobal = null;
                    if (!_this6.currentScope().isStrict) {
                        maybeImplicitGlobal = {
                            pattern: pattern,
                            node: node
                        };
                    }
                    _this6.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                    _this6.currentScope().__referencing(pattern, reference.WRITE, node.right, maybeImplicitGlobal, true, false);
                });
            }
            this.visit(node.right);
            this.visit(node.body);
        }
        this.ancestors.pop();
    }

    visitVariableDeclaration(variableTargetScope, type, node, index, fromTDZ) {
        var _this7 = this;

        // If this was called to initialize a TDZ scope, this needs to make definitions, but doesn't make references.
        var decl, init;

        decl = node.declarations[index];
        init = decl.init;
        this.visitPattern(decl.id, { processRightHandNodes: !fromTDZ }, function (pattern, info) {
            variableTargetScope.__define(pattern, new definition.Definition(type, pattern, decl, node, index, node.kind));

            if (!fromTDZ) {
                _this7.referencingDefaultValue(pattern, info.assignments, null, true);
            }
            if (init) {
                _this7.currentScope().__referencing(pattern, reference.WRITE, init, null, !info.topLevel, true);
            }
        });
    }

    /**
     * 
     * PathManager needed
     */

    currentPath(){
        return this.pathManager.__currentPath;
    }

    currentParent(){
        if(this.ancestors.length)
            return this.ancestors[this.ancestors.length-1];
        else
            return null;
    }

    exit(node){
        while (this.currentParent() && node === this.currentParent().node) {
            this.pathManager.__currentParent = this.currentParent().__exit(this.pathManager);
        }
    }

    /**
     * 
     *  Visitor for each expression and statement
     */

    Program(node) {
        this.pathManager.__stepProgram(node,this.currentScope(),null);
        this.scopeManager.__nestGlobalScope(node);

        if (this.scopeManager.isStrictModeSupported() && this.scopeManager.isImpliedStrict()) {
            this.currentScope().isStrict = true;
        }
        // TODO can not use visitChildren directly
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
        // for Program is only need to visit body
        // let body = node.body;
        // for(let j=0,jz=child.length; j<jz;++j){
        //     if(body[j]){
        //         this.visit(body[j]);
        //     }
        // }

        /**
         * 结束遍历之后需要将 currentScope 设置回上一层
         * 同时需要将 currentAncestor 设置回上一层
         */
        //this.exit(node);
        this.close(node);
    }

    BlockStatement(node) {
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        //if (this.scopeManager.__isES6()) {
            this.scopeManager.__nestBlockScope(node);
        //}

        // TODO
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();

        //this.exit(node);
        this.close(node);
    }

    AssignmentExpression(node) {
        // TODO think of path
        // wether should analysis right first?
        var _this8 = this;

        this.pathManager.__stepExpression(node,this.currentScope(), this.currentParent());

        this.ancestors.push(this.currentPath());

        var variableTargetScope = this.globalScope();
        if (PatternVisitor.isPattern(node.left)) {
            if (node.operator === '=') {
                this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                    if(!_this8.alreadyInCurrentScope(pattern.name))
                        variableTargetScope.__define(pattern, new definition.Definition("Varible", pattern, node, node, 0, 'global'));
                    var maybeImplicitGlobal = null;
                    if (!_this8.currentScope().isStrict) {
                        maybeImplicitGlobal = {
                            pattern: pattern,
                            node: node
                        };
                    }
                    _this8.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                    _this8.currentScope().__referencing(pattern, reference.WRITE, node.right, maybeImplicitGlobal, !info.topLevel, false);
                });
            } else {
                this.currentScope().__referencing(node.left, reference.RW, node.right);
            }
        } else {
            this.visit(node.left);
        }
        this.visit(node.right);

        this.ancestors.pop();
    }

    CatchClause(node) {
        var _this9 = this;

        this.pathManager.__stepStatement(node,this.currentScope(), this.currentParent());
        this.scopeManager.__nestCatchScope(node);

        this.ancestors.push(this.currentPath());
        this.visitPattern(node.param, { processRightHandNodes: true }, function (pattern, info) {
            _this9.currentScope().__define(pattern, new definition.Definition(variable.CatchClause, node.param, node, null, null, 'var'));
            _this9.referencingDefaultValue(pattern, info.assignments, null, true);
        });
        this.visit(node.body);

        this.ancestors.pop();
        //this.exit(node);
        this.close(node);
    }

    WithStatement(node) {
        this.visit(node.object);
        // Then nest scope for WithStatement.
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.scopeManager.__nestWithScope(node);
        
        this.ancestors.push(this.currentPath());
        this.visit(node.body);
        this.ancestors.pop();

        //this.exit(node);
        this.close(node);
    }

    Identifier(node) {
        // TODO 
        this.pathManager.__stepIdentifier(node,this.currentScope(), this.currentParent())
    }

    UpdateExpression(node) {
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        if (PatternVisitor.isPattern(node.argument)) {
            //this.visitChildren(node);
            this.currentScope().__referencing(node.argument, reference.RW, null);
        } else {
            // TODO can not use visitChildren directly
            // ?? is there any case to go this way???
            //this.visitChildren(node);
        }
        this.visitChildren(node);
        this.ancestors.pop();
    }

    MemberExpression(node) {
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());

        this.ancestors.push(this.currentPath());
        this.visit(node.object);
        //if (node.computed) {
            this.visit(node.property);
        //}
        this.ancestors.pop();
    }

    Property(node) {
        this.pathManager.__stepProperty(node, this.currentScope(), this.currentParent());
        
        this.ancestors.push(this.currentPath());
        this.visitProperty(node);
        this.ancestors.pop();
    }
    
    MethodDefinition(node) {
        this.pathManager.__stepMethodDefinition(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitProperty(node);
        this.ancestors.pop();
    }

    BreakStatement(node) {
        // TODO terminal statment should not be ancestor
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visit(node.label);
        this.ancestors.pop();
    }

    ContinueStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visit(node.label);
        this.ancestors.pop();
    }

    LabeledStatement(node) {
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visit(node.label);
        this.visit(node.body);
        this.ancestors.pop();
    }

    ForStatement(node) {
        this.pathManager.__stepStatement(node,this.currentScope(), this.currentParent());
        // Create ForStatement declaration.
        // NOTE: In ES6, ForStatement dynamically generates
        // per iteration environment. However, escope is
        // a static analyzer, we only generate one scope for ForStatement.
        this.ancestors.push(this.currentPath());
        if (node.init && node.init.type === estraverse.Syntax.VariableDeclaration && node.init.kind !== 'var') {
            this.scopeManager.__nestForScope(node);
        }

        // TODO can not use visitChildren directly
        this.visitChildren(node);

        this.ancestors.pop();

        //this.exit(node);
        this.close(node);
    }

    /**
     * 
     * TODO
     * 
     * While and DoWhile scope is all belong to BlockScope
     */
    WhileStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node)
        this.ancestors.pop();
        //this.exit(node);
    }

    DoWhileStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node)
        this.ancestors.pop();
        //this.exit(node);
    }

    ClassExpression(node) {
        this.visitClass(node);
    }

    ClassDeclaration(node) {
        this.visitClass(node);
    }

    CallExpression(node) {
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        
        this.ancestors.push(this.currentPath());
        // Check this is direct call to eval
        if (!this.scopeManager.__ignoreEval() && node.callee.type === estraverse.Syntax.Identifier && node.callee.name === 'eval') {
            // NOTE: This should be `variableScope`. Since direct eval call always creates Lexical environment and
            // let / const should be enclosed into it. Only VariableDeclaration affects on the caller's environment.
            this.currentScope().variableScope.__detectEval();
        }
        // TODO
        this.visitChildren(node);
        this.ancestors.pop();
    }

    ThisExpression(node) {
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.currentScope().variableScope.__detectThis();
        this.ancestors.pop();
    }

    VariableDeclaration(node) {
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        
        this.ancestors.push(this.currentPath());
        
        var variableTargetScope, i, iz, decl;
        variableTargetScope = node.kind === 'var' ? this.currentScope().variableScope : this.currentScope();
        for (i = 0, iz = node.declarations.length; i < iz; ++i) {
            decl = node.declarations[i];
            this.visitVariableDeclaration(variableTargetScope, variable.Variable, node, i);
            if (decl.init) {
                this.visit(decl.init);
            }
        }
        this.ancestors.pop();
    }

    SwitchStatement(node) {
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        var i, iz;

        this.ancestors.push(this.currentPath());
        this.visit(node.discriminant);

        //if (this.scopeManager.__isES6()) {
            this.scopeManager.__nestSwitchScope(node);
        //}

        for (i = 0, iz = node.cases.length; i < iz; ++i) {
            this.visit(node.cases[i]);
        }
        this.ancestors.pop();
        //this.exit(node);
        this.close(node);
    }

    FunctionDeclaration(node) {
        this.visitFunction(node);
    }

    FunctionExpression(node) {
        this.visitFunction(node);
    }

    ForOfStatement(node) {
        this.visitForIn(node);
    }

    ForInStatement(node) {
        this.visitForIn(node);
    }

    ArrowFunctionExpression(node) {
        this.visitFunction(node);
    }

    MetaProperty(node) {
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
    }

    /**
     * 
     * TODO: consider whether need to do extra job
     */
    ArrayExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    ArrayPattern(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    NewExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    AwaitExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    BinaryExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    /**
     * 
     * TODO ClassBody
     */
    ClassBody(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    ConditionalExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    EmptyStatement(node){
        // do nothing
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
    }

    ExpressionStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    IfStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());

        this.visit(node.test);
        this.visit(node.consequent);
        this.visit(alternate);

        this.ancestors.pop();
    }

    Literal(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
    }

    LogicalExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    // TODO
    ObjectExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    ObjectPattern(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    // TODO 
    RestElement(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    ReturnStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    SequenceExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    SpreadElement(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.visitChildren(node);
    }

    Super(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        //this.visit(node);
    }

    SwitchCase(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    TaggedTemplateExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    TemplateElement(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    TemplateLiteral(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    ThrowStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    TryStatement(node){
        this.pathManager.__stepStatement(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    UnaryExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }

    YieldExpression(node){
        this.pathManager.__stepExpression(node, this.currentScope(), this.currentParent());
        this.ancestors.push(this.currentPath());
        this.visitChildren(node);
        this.ancestors.pop();
    }




    // TODO module

    ImportDeclaration(node) {
        var importer;

        (0, _assert2.default)(this.scopeManager.__isES6() && this.scopeManager.isModule(), 'ImportDeclaration should appear when the mode is ES6 and in the module context.');

        importer = new Importer(node, this);
        importer.visit(node);
    }

    visitExportDeclaration(node) {
        if (node.source) {
            return;
        }
        if (node.declaration) {
            this.visit(node.declaration);
            return;
        }

        this.visitChildren(node);
    }

    ExportDeclaration(node) {
        this.visitExportDeclaration(node);
    }

    ExportNamedDeclaration(node) {
        this.visitExportDeclaration(node);
    }

    ExportSpecifier(node) {
        var local = node.id || node.local;
        this.visit(local);
    }
}

module.exports = Referencer;