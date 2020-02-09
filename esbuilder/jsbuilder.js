var esrecurse = require('esrecurse');
var estraverse = require('estraverse');
var PathManager = require('../espath/lib/path-manager');
var ScopeManager = require('../espath/lib/scope-manager');
var esbuilder = require('./esbuilder');
var random = require('./random');
var rawValue = require('./raw');

var variable = require('./variable').default;
var reference = require('./reference');
//require('../espath/lib/path');

var ValueInfo = require('../espath/lib/path').valueinfo;
var ValueType = require('../espath/lib/path').valuetype;
var ValueMap = require('../espath/lib/path').valuemap;

var definition = require('./definition');
var PatternVisitor = require('./pattern-visitor').default;

function traverseIdentifierInPattern(options, rootPattern, referencer, callback) {
    // Call the callback at left hand identifier nodes, and Collect right hand nodes.
    var visitor = new PatternVisitor(options, rootPattern, callback);
    visitor.visit(rootPattern);

    // Process the right hand nodes recursively.
    //if (referencer != null) {
    //    visitor.rightHandNodes.forEach(referencer.visit, referencer);
    //}
}

class Builder extends esbuilder.Builder{
    /**
     * state = {depth, globalCount, varCount, letCount, classCount
     *  constCount, funcCount, labelCount, newable, newParam,
     *  constructor, isConstructor, extends. newFunc, newClass,
     * infunction, isProperty, propCount}
     * 
     * when there is no usable varible, and newable is true
     * we can get a new identifier, and register it into golbal scope
     */
    constructor(options, scopeManager, pathManager) {
        super(null, options);
        //this.options = options;
        this.state = options.state;
        this.scopeManager = scopeManager;
        this.pathManager = pathManager;
        this.predcessor = null;
        this.isInnerMethodDefinition = false;
    }

    /**
     * utils to manage state
     */
    globalVaribleName(){
        return 'glob_'+(this.state.globalCount++);
    }

    parameterName(){
        return 'param_'+(this.state.paramCount++);
    }

    functionName(){
        return 'func_'+(this.state.funcCount++);
    }

    className(){
        return 'class_'+(this.state.classCount++);
    }

    labelName(){
        return 'label_'+(this.state.labelCount++);
    }

    propName(){
        return 'prop_'+(this.state.propCount++);
    }

    varName(){
        return 'var_'+(this.state.varCount++);
    }

    resetParamCount(){
        //this.state.paramCount = 0;
    }

    resetLetCount(){
        //this.state.letCount = 0;
    }

    resetConstCount(){
        //this.state.constCount = 0;
    }

    enableNewable(){
        this.state.newable = true;
    }

    disableNewable(){
        this.state.newable = false;
    }

    enableNewParam(){
        this.state.newParam = true;
    }

    disableNewParam(){
        this.state.newParam = false;
    }

    /**
     * 
     * utils function
     */
    copy(node){
        if (node == null)
            return;
        var isArray = Array.isArray(node); 
        let shadow = isArray?[]:{};
        for (let key in node){
            if (typeof node[key] == "object"){
                shadow[key] = copy(node[key]);
            }
            else{
                shadow[key] = node[key];
            }
        }
        return shadow;
    }

    currentVaribles(){
        let currentVaribles = [];
        let scopeVisitor = this.currentPath().scope;
        while(scopeVisitor){
            for(let varible of scopeVisitor.variables){
                currentVaribles.push(varible.name);
            }
            scopeVisitor = scopeVisitor.upper;
        }
        return currentVaribles;
    }

    currentFunctions(){
        let currentFunctions = [];
        let scopeVisitor = this.currentPath().scope;
        while(scopeVisitor){
            for(let varible of scopeVisitor.variables){
                if(varible.defs.length && (varible.defs[0].type == variable.FunctionName))
                    currentFunctions.push(varible.name);
            }
            scopeVisitor = scopeVisitor.upper;
        }
        return currentFunctions;
    }

    currentClasses(){
        let currentClasses = [];
        let scopeVisitor = this.currentPath().scope;
        while(scopeVisitor){
            for(let varible of scopeVisitor.variables){
                if(varible.defs.length && (varible.defs[0].type == variable.ClassName))
                currentClasses.push(varible.name);
            }
            scopeVisitor = scopeVisitor.upper;
        }
        return currentClasses;
    }

    currentScope(){
        return this.scopeManager.__currentScope;
    }

    currentPath(){
        return this.pathManager.__currentPath;
    }

    currentValueMap(){
        return this.pathManager.__currentValueMap;
    }

    currentValueTable(){
        return this.pathManager.__valueTable;
    }
    /**
     * 
     * Utils to manager scope 
     */

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

    visitPattern(node, options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = { processRightHandNodes: false };
        }
        traverseIdentifierInPattern(this.options, node, options.processRightHandNodes ? this : null, callback);
    }

    /**
     * Classes
     */

    Statement(node, parent, pred){
        if(this.state.depth<=0){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        // TODO WithStatement

        var Statements = [
            this.BlockStatement,this.BlockStatement,
            this.BreakStatement,
            this.ContinueStatement,
            //this.DoWhileStatement,   // while and dowhile is same as for
            this.EmptyStatement,
            this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,this.ExpressionStatement,
            this.ForStatement,
            this.ForInStatement,
            //this.ForOfStatement,
            this.FunctionDeclaration,this.FunctionDeclaration,
            this.IfStatement,
            this.LabeledStatement,
            this.ReturnStatement,
            this.SwitchStatement,
            //this.ThrowStatement,
            this.TryStatement,
            this.VariableDeclaration,this.VariableDeclaration,
            //this.WhileStatement,
            this.MetaProperty,
            this.ClassDeclaration,
            this.WithStatement,    // with is not allow in strict mode
        ];
        random.randomElement(Statements).call(this, node, parent, pred);
    }

    Expression(node, parent, pred){
        if(this.state.test){
            this.Literal(node, parent, pred);
            return
        }

        if(this.state.depth<=0){
            random.randomElement([this.Literal,this.Identifier]).call(this,node, parent, pred);
            return;
        }

        /// TODO ArrayPattern, ObjectPattern, AwaitExpression
        //      , SpreadElement,RestElement
        var Expressions = [
            this.ArrayExpression,this.ArrayExpression,
            //this.AssignmentPattern,  // assignment pattern can only be available in parameter
            this.AwaitExpression,
            this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,this.AssignmentExpression,
            this.BinaryExpression,this.BinaryExpression,this.BinaryExpression,this.BinaryExpression,this.BinaryExpression,this.BinaryExpression,
            this.CallExpression,this.CallExpression,this.CallExpression,this.CallExpression,
            this.ConditionalExpression,
            this.FunctionExpression,
            this.Identifier,this.Identifier,this.Identifier,this.Identifier,
            this.LogicalExpression,
            this.MemberExpression,this.MemberExpression, // TODO Add
            this.NewExpression,
            this.ObjectExpression,this.ObjectExpression,
            this.SequenceExpression,
            this.ThisExpression,
            this.UnaryExpression,
            this.UpdateExpression,this.UpdateExpression,
            this.YieldExpression,
            this.ArrowFunctionExpression,
            this.ClassExpression,
            this.ArgumentsToken,
            this.Literal,this.Literal,
            this.SpreadElement,  //can only used in callExpression,ArrayExpression and ObjectExpression
        ];

        random.randomElement(Expressions).call(this,node, parent, pred);
    }

    Object(node, parent, pred){

        if(this.state.depth<=0){
            random.randomElement([this.Identifier]).call(this,node, parent, pred);
            return;
        }

        var Expressions = [
            this.ArrayExpression,this.ArrayExpression,this.ArrayExpression,
            this.AssignmentExpression,
            this.BinaryExpression,
            this.CallExpression,
            this.ConditionalExpression,
            this.FunctionExpression,
            this.Identifier,this.Identifier,this.Identifier,this.Identifier,
            this.MemberExpression,this.MemberExpression,this.MemberExpression,this.MemberExpression,
            this.NewExpression,
            this.ObjectExpression,this.ObjectExpression,this.ObjectExpression,this.ObjectExpression,
            this.ThisExpression,
            this.UnaryExpression,
            this.ArrowFunctionExpression,
            this.ClassExpression,
        ];

        random.randomElement(Expressions).call(this,node, parent, pred);
    }

    LHSPattern(node, parent, pred){
        if(this.state.depth<=0){
            return this.Identifier.call(this, node, parent, pred);
        }
        //
        var LHSPatterns = [
            this.Identifier,
            //this.ArrayPattern,
            //this.ObjectPattern
        ]

        if(!this.state.isParam && !/AssignmentPattern/.test(parent.type)){
            LHSPatterns.push(this.MemberExpression);
        }

        random.randomElement(LHSPatterns).call(this,node, parent, pred);
    }

    /**
     * Parameter can only be identifier, arrayPattern, ObjectPattern and Rest
     */
    Parameter(node, parent, pred){
        
        if(this.state.depth<=0 || this.state.setter){
            this.Identifier.call(this,node, parent, pred);
            return;
        }

        var ParameterPatterns = [
            this.AssignmentPattern,
            this.Identifier,
            //this.RestElement, //TODO RestElement must be the last param
            //this.ArrayPattern,  // TODO 
            //this.ObjectPattern,
        ]

        // there shold not be much complex in param
        var old_depth = this.state.depth
        this.state.depth = Math.min(2,old_depth);
        random.randomElement(ParameterPatterns).call(this,node, parent, pred);
        this.state.depth = old_depth;
    }

    /**
     * Callee must be a function
     */
    CalleeExpression(node, parent, pred){
        if(this.state.depth<=0){
            this.Identifier.call(this,node, parent, pred);
            return;
        }

        var CalleeExpressions = [
            this.FunctionExpression,
            this.Identifier,
            //this.NewExpression,
            this.MemberExpression,
        ]

        if(!/NewExpression/.test(parent.type)){
            CalleeExpressions.push(this.ArrowFunctionExpression);
        }

        if(this.state.extends && this.state.inConstrctor){
            CalleeExpressions.push(this.Super);
        }

        random.randomElement(CalleeExpressions).call(this,node, parent, pred);
    }

    /**
     * Iteralable epression
     * TODO : MemberExpression
     */
    IterableExpression(node, parent, pred){
        if(this.state.depth<=0){
            this.String.call(this,node, parent, pred);
            return;
        }

        var IterableExpressions = [
            this.ArrayExpression,
            this.ObjectExpression,
            this.String,
            this.Identifier
        ]

        // if(!this.state.isParam && !/AssignmentPattern/.test(parent.type)){
        //     LHSPatterns.push(this.MemberExpression);
        // }

        random.randomElement(IterableExpressions).call(this,node, parent, pred);
    }

    /**
     * Expression
     */

    ArgumentsToken(node, parent, pred){
        if(this.currentScope().type == 'function'){
            this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

            node.type = estraverse.Syntax.Identifier;
            node.name = "arguments";
            this.pathManager.__stepOutExpression(node,()=>{});
        }
        else{
            this.Identifier(node, parent, pred);
        }
    }

    NewToken(node, parent, pred){
        node.type = estraverse.Syntax.Identifier;
        node.name = 'new';
    }

    TargetToken(node, parent, pred){
        node.type = estraverse.Syntax.Identifier;
        node.name = 'target';
    }

    ConstructorToken(node, parent, pred){
        node.type = estraverse.Syntax.Identifier;
        node.name = "constructor";
    }

    ArrayExpression(node, parent, pred){
        var _this =this;

        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        this.state.depth--;

        node.type = estraverse.Syntax.ArrayExpression;

        node.elements = this.buildList(0,['Expression'], node, node);
        this.state.depth++;

        this.pathManager.__stepOutArrayExpression(node,(_path)=>{
            for(let expression of node.elements){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
    }

    ArrayPattern(node, parent, pred){
        var _this = this;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        this.state.depth--;

        node.type = estraverse.Syntax.ArrayPattern;
        node.elements = this.buildList(1,["LHSPattern"], node, node);
        this.state.depth++;

        this.pathManager.__stepOutExpression(node,(_path)=>{
            for(let expression of node.elements){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
        }});
    }

    /**
     * Arrow need at least 2 depth
     */
    ArrowFunctionExpression(node, parent, pred){

        // if(this.state.depth<=2){
        //     random.randomElement([this.Literal,this.Identifier]).call(this,node, parent, pred);
        //     return;
        // }

        var _this5 = this;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);
        this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);

        this.state.depth--;
        node.type = estraverse.Syntax.ArrowFunctionExpression;

        if(this.state.needConstruct){
            node.async = false;
            node.generator = false;
        }else{
            node.async = random.randomBool(0.1);
            node.generator = random.randomBool(0.1);
        }
        node.id = null;
        //this.resetParamCount();
        this.enableNewParam();
        this.state.isParam = true;
        node.params = this.buildList(0,["Parameter"], node, node);
        this.state.isParam = false;
        if(random.randomBool(0.2)){
            node.params.push(this.build("RestElement", node, node));
        }
        this.disableNewParam();

        for (let i = 0, iz = node.params.length; i < iz; ++i) {
            this.visitPattern(node.params[i], { processRightHandNodes: true }, function (pattern, info) {
                _this5.currentScope().__define(pattern, new definition.ParameterDefinition(pattern, node, i, info.rest));
                if(/Identifier/.test(pattern.type))
                    _this5.currentValueMap().set(pattern.name,new ValueType(0x00ff,["anyType"]));
                else if(/AssignmentPattern/.test(pattern.type))
                    _this5.currentValueMap().set(pattern.left.name,new ValueType(0x00ff,["anyType"]));

                _this5.referencingDefaultValue(pattern, info.assignments, null, true);
            });
        }

        this.state.cannotEmpty = true;
        node.body = this.build("BlockStatement", node, node.param);
        this.state.cannotEmpty = false;

        this.state.depth++;
        this.close(node);

        this.pathManager.__stepOutFunctionExpression(node,(_path)=>{
            for(let expression of node.params){
                let path = _this5.pathManager.acquire(expression);
                _path.update(path);
            }
    
            let path = _this5.pathManager.acquire(node.body);
            _path.update(path);
        });
    }

    AssignmentExpression(node, parent, pred){

        var _this = this;
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.AssignmentExpression;
        this.enableNewable();
        node.left = this.build("LHSPattern", node, node);
        this.disableNewable();
        if(/Pattern/.test(node.left.type)){
            node.right = this.build("IterableExpression", node, node);
        }else{
            node.right = this.build("Expression", node, node);
        }

        node.operator = random.randomElement(variable.ASSIGN_OPERATORS);

        if (PatternVisitor.isPattern(node.left)) {
            if (node.operator === '=') {
                this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                    var maybeImplicitGlobal = null;
                    if (!_this.currentScope().isStrict) {
                        maybeImplicitGlobal = {
                            pattern: pattern,
                            node: node
                        };
                    }
                    _this.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                    _this.currentScope().__referencing(pattern, reference.WRITE, node.right, maybeImplicitGlobal, !info.topLevel, false);
                });
            } else {
                this.currentScope().__referencing(node.left, reference.RW, node.right);
            }
        }

        this.state.depth++;
        this.pathManager.__stepOutAssignmentExpression(node,(_path)=>{});
    }

    AssignmentPattern(node, parent, pred){
        var _this = this;
        /**
         * The only reference of this fun is from param ,so there is no need to verify
         */
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.AssignmentPattern;
        node.right = this.build("Expression", node, node);
        this.enableNewable();
        // AssignmentPattern lhs should not have memberexpression
        this.state.isLeft = true;
        node.left = this.build("LHSPattern", node, node);
        this.state.isLeft = false;
        this.disableNewable();

        node.operator = '='//random.randomElement(variable.ASSIGN_OPERATORS);

        if (PatternVisitor.isPattern(node.left)) {
            if (node.operator === '=') {
                this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                    var maybeImplicitGlobal = null;
                    if (!_this.currentScope().isStrict) {
                        maybeImplicitGlobal = {
                            pattern: pattern,
                            node: node
                        };
                    }
                    _this.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                    _this.currentScope().__referencing(pattern, reference.WRITE, node.right, maybeImplicitGlobal, !info.topLevel, false);
                });
            } else {
                this.currentScope().__referencing(node.left, reference.RW, node.right);
            }
        }

        this.state.depth++;
        this.pathManager.__stepOutAssignmentPattern(node,(_this)=>{});
    }

    AwaitExpression(node, parent, pred){
        var _this = this;
        if(awaitable()){
            this.state.depth--;
            this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

            node.type = estraverse.Syntax.AwaitExpression;
            node.argument = this.build("Expression", node, node);
                
            this.state.depth++;
        }
        else{
            this.Identifier(node, parent, pred);
        }

        function awaitable(){
            let scopeVisitor = _this.currentScope()
            while(scopeVisitor){
                if(scopeVisitor.type == 'function' && scopeVisitor.block.async && !_this.state.isParam){
                    return true;
                }
                scopeVisitor = scopeVisitor.upper;
            }
            return false;
        }

        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path, true);
        });
    }

    /**
     * BinaryExpression can be used in any expression
     */
    BinaryExpression(node, parent, pred){
        var _this = this;
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.BinaryExpression;

        node.operator = random.randomElement(variable.BINARY_OPERATORS);
        node.left = this.build("Expression", node, node);
        
        if(node.operator == 'instanceof'){
            this.state.needFunc = true;
            node.right = this.build("Identifier", node, node);
            this.state.needFunc = false;
        }else{
            node.right = this.build("Expression", node, node);
        }

        this.state.depth++;

        this.pathManager.__stepOutBinaryExpression(node,(_path)=>{});
    }

    /**
     *  WARNING!!!!
     */
    BlockStatement(node, parent, pred){
        // function body can not be emptyStatement
        var _this = this;
        if(this.state.cannotEmpty && this.state.depth<=0){
            this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);
            node.type = estraverse.Syntax.BlockStatement;
            node.body = this.buildList(0,["Statement"], node, node);
            this.pathManager.__stepOutStatement(node,(_path)=>{

                for(let statement of node.body){
                    let path = _this.pathManager.acquire(statement);
                    _path.update(path);
                }
            });
            return;
        }

        if(this.state.depth<=0){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.BlockStatement;

        if(!/Function/.test(parent.type)){
            this.scopeManager.__nestBlockScope(node);
            node.body = this.buildList(1,["Statement"], node, node);
            this.close(node);
        }else{
            node.body = this.buildList(1,["Statement"], node, node);
        }

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    /**
     * label is only accessable inside label ,so there is no need to save it in scope
     */
    BreakStatement(node, parent, pred){
        let labels = [null];
        let _this = this;
        if(breakable()){
            this.state.depth--;
            this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

            node.type = estraverse.Syntax.BreakStatement;
            getlabel();
            if(inLoop()){
                node.label = random.randomElement(labels);
            }else{
                labels.shift();
                node.label = random.randomElement(labels);
            }

            this.state.depth++;
        }
        else{
            this.EmptyStatement(node, parent, pred);
        }

        function breakable(){
            let pathVisitor = _this.currentPath()
            while(pathVisitor){
                if(pathVisitor.node.type == 'LabeledStatement' || pathVisitor.node.type == 'SwitchStatement' || pathVisitor.node.type == 'ForStatement' || pathVisitor.node.type == 'ForInStatement' || pathVisitor.node.type == 'ForOfStatement' || pathVisitor.node.type == 'WhileStatement' || pathVisitor.node.type == 'DoWhileStatement'){
                    return true;
                }
                if(/Class/.test(pathVisitor.node.type) || /Function/.test(pathVisitor.node.type)){
                    break;
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
            return false;
        }

        function inLoop(){
            let pathVisitor = _this.currentPath();
            while(pathVisitor){
                if(pathVisitor.node.type == 'SwitchStatement' || pathVisitor.node.type == 'ForStatement' || pathVisitor.node.type == 'ForInStatement' || pathVisitor.node.type == 'ForOfStatement' || pathVisitor.node.type == 'WhileStatement' || pathVisitor.node.type == 'DoWhileStatement'){
                    return true;
                }
                if(/Class/.test(pathVisitor.node.type) || /Function/.test(pathVisitor.node.type)){
                    break;
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
            return false;
        }

        function getlabel(){
            let pathVisitor = _this.currentPath()
            while(pathVisitor){
                if(pathVisitor.node.type == 'LabeledStatement'){
                    labels.push(_this.copy(pathVisitor.node.label));
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
        });
    }

    /**
     * Normal
     * TODO make sure the CalleeExpression is callable
     * TODO consider the super in Class
     */
    CallExpression(node, parent, pred){
        var _this = this;
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.CallExpression;

        this.state.needFunc = true;
        node.callee = this.build("CalleeExpression", node, node);
        this.state.needFunc = false;
        node.arguments = this.buildList(0,["Expression"], node, node.callee);

        this.state.depth++;
        this.pathManager.__stepOutCallExpression(node,(_path)=>{
            let path;
            for(let expression of node.arguments){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
            path = _this.pathManager.acquire(node.callee);
            _path.update(path);
        });
    }

    /**
     * class need at least 2 depth
     */
    ClassDeclaration(node, parent, pred){
        if(this.state.depth <=2 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        this.scopeManager.__nestClassScope(node);

        node.type = estraverse.Syntax.ClassDeclaration;
        this.state.newClass = true;
        node.id = this.build("Identifier", node, node);
        this.state.newClass = false;

        if(random.randomBool(0.2)){
            //TOOD make sure this Identifier is a class/function or return null
            this.state.needFunc = true;
            node.superClass = this.build("Identifier", node, node);
            this.state.needFunc = false;

            if(node.superClass)
                this.state.extends = true;

            // TODO 
            // class body should not refer to cls itself
            node.body = this.build("ClassBody", node, node.superClass);
            this.state.extends = false;
        }else{
            node.superClass = null;
            node.body = this.build("ClassBody", node, node);
        }
        this.state.depth++;
        this.close(node);

        // register this class to scope
        this.currentScope().__define(node.id, new definition.Definition(variable.ClassName, node.id, node));

        this.pathManager.__stepOutClassDeclaration(node, ()=>{});
    }

    ClassExpression(node, parent, pred){
        var _this = this;
        if(this.state.depth <=2 ){
            random.randomElement([this.Literal,this.Identifier]).call(this,node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        this.scopeManager.__nestClassScope(node);

        node.type = estraverse.Syntax.ClassExpression;
        this.state.newClass = true;
        node.id = this.build(random.randomElement([null,"Identifier"]),node, node);
        this.state.newClass = false;      

        if(random.randomBool(0.2)){
            //TOOD make sure this Identifier is a class/function
            this.state.needFunc = true;
            node.superClass = this.build("Identifier", node, node);
            this.state.needFunc = false;
            this.state.extends = true;
            node.body = this.build("ClassBody", node, node.superClass);
            this.state.extends = false;
        }else{
            node.superClass = null;
            node.body = this.build("ClassBody", node, node);
        }

        this.state.depth++;
        this.close(node);

        this.currentScope().__define(node.id, new definition.Definition(variable.ClassName, node.id, node));

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.id);
            if(path){
                _path.update(path);
            }
            path = _this.pathManager.acquire(node.superClass);
            if(path){
                _path.update(path);
            }
            path = _this.pathManager.acquire(node.body);
            if(!path){
                console.log(node);
            }
            _path.update(path);
        });
    }

    ClassBody(node, parent, pred){
        var _this = this;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ClassBody;

        node.body = this.buildList(0,["MethodDefinition"], node, node);
        this.pathManager.__stepOutClassBody(node,(_path)=>{});
    }

    MethodDefinition(node, parent, pred){

        /**
         *    MethodDefinition must be a function 
         */
        if(this.state.depth <=2 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.MethodDefinition;
        node.async = false;//random.randomBool(0.1);
        node.static = random.randomBool(0.1);
        node.kind = random.randomElement(variable.METHOD_KINDS);
        // TODO
        node.computed = false;  

        this.state.newFunc = true;
        node.key = this.build("Identifier", node, node);
        this.state.newFunc = false;

        var previous = this.pushInnerMethodDefinition(true);

        switch(node.kind){
            case 'set':
                this.state.setter = true;
                break;
            case 'get':
                this.state.getter = true;
                break;
        }
        node.value = this.build("FunctionExpression", node, node);
        this.state.setter = false;
        this.state.getter = false;

        this.popInnerMethodDefinition(previous);

        this.state.depth++;

        this.pathManager.__stepOutMethodDefinition(node,()=>{});
    }

    MethodDefinitionConstructor(node, parent, pred){
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.MethodDefinition;
        node.async = false;
        node.static = false;
        node.kind = 'constructor';
        // TODO
        node.computed = false;  

        node.key = this.build("ConstructorToken", node, node);

        // super can only in constructor 
        previous = this.pushInnerMethodDefinition(true);
        this.state.inConstrctor = true;
        node.value = this.build("FunctionExpression", node, node);
        this.state.inConstrctor = false;
        this.popInnerMethodDefinition(previous);

        this.state.depth++;
        this.pathManager.__stepOutMethodDefinition(node,()=>{});
    }

    /**
     * Condition Expression ? Expression : Expression
     */
    ConditionalExpression(node, parent, pred){
        var _this = this;
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ConditionalExpression;
        node.test = this.build("Expression", node, node);
        node.consequent = this.build("Expression", node, node.test);
        node.alternate = this.build("Expression", node, node.test);

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            _path.update(path);
            path = _this.pathManager.acquire(node.alternate);
            _path.update(path);
        });
    }

    /**
     * Continue ,same as breakStatement except swtich
     */
    ContinueStatement(node, parent, pred){
        var labels = [null];
        var _this = this;
       
        if(continuable()){
            this.state.depth--;
            this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

            node.type = estraverse.Syntax.ContinueStatement;
            getlabel();
            
            node.label = random.randomElement(labels);

            this.state.depth++;
        }
        else{
            this.EmptyStatement(node, parent, pred);
        }

        function continuable(){
            let pathVisitor = _this.currentPath()
            while(pathVisitor){
                if( pathVisitor.node.type == 'ForStatement' || pathVisitor.node.type == 'ForInStatement' || pathVisitor.node.type == 'ForOfStatement' || pathVisitor.node.type == 'WhileStatement' || pathVisitor.node.type == 'DoWhileStatement'){
                    return true;
                }

                if(/Class/.test(pathVisitor.node.type) || /Function/.test(pathVisitor.node.type)){
                    break;
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
            return false;
        }

        function getlabel(){
            let pathVisitor = _this.currentPath()
            while(pathVisitor){
                if(pathVisitor.node.type == 'LabeledStatement'){
                    labels.push(_this.copy(pathVisitor.node.label));
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
        });
    }

    /**
     * DoWhile
     * 
     * TODO make sure it is not a dead loop
     */
    DoWhileStatement(node, parent, pred){
        // used to reduce the posibiity of Forin
        var _this = this;
        if(random.randomBool()){
            this.Statement(node, parent, pred);
            return;
        }

        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.DoWhileStatement;
        node.body = this.build("BlockStatement", node, node);
        this.state.loopHead = true;
        // do not make test complex
        var old_depth = this.state.depth;
        this.state.depth = Math.min(2,old_depth);
        node.test = this.build("Expression", node, node);
        this.state.depth = old_depth;
        this.state.loopHead = false;

        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.body);
            _path.update(path);
            path = _this.pathManager.acquire(node.test);
            _path.update(path);
        });
    }

    EmptyStatement(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.EmptyStatement;
        this.pathManager.__stepOutStatement(node,()=>{});
    }

    ExpressionStatement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ExpressionStatement;
        node.expression = this.build("Expression", node, node);

        this.state.depth++;

        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.expression);
            _path.update(path);
        });
    }

    /**
     * all Declaration in for head is var!!
     */
    ForInStatement(node, parent, pred){
        // used to reduce the posibiity of Forin
        if(random.randomBool()){
            this.Statement(node, parent, pred);
            return;
        }
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ForInStatement;
        // TODO make sure the value is iterable
        node.right = this.build("Expression", node, node);
        this.state.forinHead = true;
        node.left = this.build("VariableDeclaration", node, node);
        this.state.forinHead = false;

        if (node.left.type === estraverse.Syntax.VariableDeclaration){
            this.visitPattern(node.left.declarations[0].id, function (pattern) {
                _this.currentScope().__referencing(pattern, reference.WRITE, node.right, null, true, true);
            });
        }else {
            this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                var maybeImplicitGlobal = null;
                if (!_this.currentScope().isStrict) {
                    maybeImplicitGlobal = {
                        pattern: pattern,
                        node: node
                    };
                }
                _this.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                _this.currentScope().__referencing(pattern, reference.WRITE, node.right, maybeImplicitGlobal, true, false);
            });
        }

        node.body = this.build("BlockStatement", node, node.left);

        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.right);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.left);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.body);
            if(path)
                _path.update(path);
        });
    }

    ForOfStatement(node, parent, pred){
        // used to reduce the posibiity of Forin
        if(random.randomBool()){
            this.Statement(node, parent, pred);
            return;
        }
        var _this = this;
        // forof need at least 2 depth
        if(this.state.depth <=1 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ForOfStatement;
        // TODO make sure the value is iterable
        node.right = this.build("Expression", node, node);
        this.state.forinHead = true;
        node.left = this.build("VariableDeclaration", node, node);
        this.state.forinHead = false;

        if (node.left.type === estraverse.Syntax.VariableDeclaration){
            this.visitPattern(node.left.declarations[0].id, function (pattern) {
                _this.currentScope().__referencing(pattern, reference.WRITE, node.right, null, true, true);
            });
        }else {
            this.visitPattern(node.left, { processRightHandNodes: true }, function (pattern, info) {
                var maybeImplicitGlobal = null;
                if (!_this.currentScope().isStrict) {
                    maybeImplicitGlobal = {
                        pattern: pattern,
                        node: node
                    };
                }
                _this.referencingDefaultValue(pattern, info.assignments, maybeImplicitGlobal, false);
                _this.currentScope().__referencing(pattern, reference.WRITE, node.right, maybeImplicitGlobal, true, false);
            });
        }

        node.body = this.build("BlockStatement", node, node.left);

        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.right);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.left);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.body);
            if(path)
                _path.update(path);
        });
    }

    /**
     * TODO make the loop more versatile
     */

    ForStatement(node, parent, pred){
        // used to reduce the posibiity of Forin
        var _this = this;
        if(random.randomBool()){
            this.Statement(node, parent, pred);
            return;
        }

        if(this.state.depth <=1 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        
        node.type = estraverse.Syntax.ForStatement;
        this.state.loopHead = true;
        var old_depth = this.state.depth;
        this.state.depth = Math.min(2,old_depth);
        node.init = this.build(random.randomElement(["Expression","VariableDeclaration"]), node, node);
        node.test = this.build(random.randomElement(["Expression",null]), node, node.init);
        this.state.depth = old_depth;
        this.state.loopHead = false;

        node.body = this.build("BlockStatement", node, node.test);
        node.update = this.build(random.randomElement(["UpdateExpression",null]), node, node.body);

        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.init);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.test);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.body);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.update);
            if(path)
                _path.update(path);
        });
    }

    /**
     * FunctionDec
     */
    FunctionDeclaration(node, parent, pred){
        var _this5 = this;
        // if(this.state.depth <=2 ){
        //     this.EmptyStatement(node, parent, pred);
        //     return;
        // }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.FunctionDeclaration;
        node.async = random.randomBool(0.1);
        node.generator = random.randomBool(0.1);
        this.state.newFunc = true;
        node.id = this.build("Identifier", node, node);
        this.state.newFunc = false;
        //this.resetParamCount();
        this.enableNewParam();
        this.state.isParam = true;
        // dumplicate param should not have default value
        let predNode = node.id;
        node.params = this.buildList(0,["Parameter"], node, predNode);
        if(node.params.length){
            predNode = node.params[node.params.length-1];
        }
        this.state.isParam = false;
        if(random.randomBool(0.2)){
            node.params.push(this.build("RestElement", node, predNode));
            predNode = node.params[node.params.length-1];
        }
        this.disableNewParam();

        // function is accessable inside itself
        this.currentScope().__define(node.id, new definition.Definition(variable.FunctionName, node.id, node, null, null, null));
        this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);
        for (let i = 0, iz = node.params.length; i < iz; ++i) {
            this.visitPattern(node.params[i], { processRightHandNodes: true }, function (pattern, info) {
                _this5.currentScope().__define(pattern, new definition.ParameterDefinition(pattern, node, i, info.rest));
                if(/Identifier/.test(pattern.type))
                    _this5.currentValueMap().set(pattern.name,new ValueType(0x00ff,["anyType"]));
                else if(/AssignmentPattern/.test(pattern.type))
                    _this5.currentValueMap().set(pattern.left.name,new ValueType(0x00ff,["anyType"]));

                _this5.referencingDefaultValue(pattern, info.assignments, null, true);
            });
        }
        this.state.infunction = true;
        this.state.cannotEmpty = true;
        node.body = this.build("BlockStatement", node, node.params);  // at this time func is not record in the valueMap
        this.state.cannotEmpty = false;
        this.state.infunction = false;

        this.close(node);
        this.state.depth++;
        this.pathManager.__stepOutFunctionDeclaration(node,()=>{});
        //console.log(this.currentScope());
    }

    /**
     * FunctionExpression need at least 2 depth
     */
    FunctionExpression(node, parent, pred){
        var _this5 = this;
        // if(this.state.depth <=2 ){
        //     random.randomElement([this.Identifier, this.Literal]).call(this,node, parent, pred);
        //     return;
        // }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.FunctionExpression;
        if(this.state.needConstruct){
            node.async = false;
            node.generator = false;
        }else{
            node.async = random.randomBool(0.1);
            node.generator = random.randomBool(0.1);
        }
        this.state.newFunc = true;
        node.id = null;//random.randomElement([this.build("Identifier"),null]);
        this.state.newFunc = false;
        //this.resetParamCount();
        this.enableNewParam();
        // setter must have exactly one formal parameter
        // getter can not have parameter
        this.state.isParam = true;
        if(this.state.setter){
            node.params = this.buildListExact(1,["Parameter"], node, node);
        }else if (this.state.getter){
            node.params = this.buildListExact(0,["Parameter"], node, node);
        }else{
            node.params = this.buildList(0,["Parameter"], node, node);
        }
        this.state.isParam = false;
        if(random.randomBool(0.2)){
            node.params.push(this.build("RestElement", node, node));
        }
        this.disableNewParam();

        this.currentScope().__define(node.id, new definition.Definition(variable.FunctionName, node.id, node, null, null, "function"));
        this.scopeManager.__nestFunctionScope(node, this.isInnerMethodDefinition);
        for (let i = 0, iz = node.params.length; i < iz; ++i) {
            this.visitPattern(node.params[i], { processRightHandNodes: true }, function (pattern, info) {
                _this5.currentScope().__define(pattern, new definition.ParameterDefinition(pattern, node, i, info.rest));
                if(/Identifier/.test(pattern.type))
                    _this5.currentValueMap().set(pattern.name,new ValueType(0x00ff,["anyType"]));
                else if(/AssignmentPattern/.test(pattern.type))
                    _this5.currentValueMap().set(pattern.left.name,new ValueType(0x00ff,["anyType"]));

                _this5.referencingDefaultValue(pattern, info.assignments, null, true);
            });
        }

        this.state.infunction = true;
        this.state.cannotEmpty = true;
        node.body = this.build("BlockStatement", node, node.params);
        this.state.cannotEmpty = false;
        this.state.infunction = false;

        this.state.depth++;
        this.close(node);

        this.pathManager.__stepOutFunctionExpression(node,(_path)=>{
            for(let expression of node.params){
                let path = _this5.pathManager.acquire(expression);
                _path.update(path);
            }
    
            let path = _this5.pathManager.acquire(node.body);
            _path.update(path);
        });
    }

    Literal(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.Literal;
        node.value = rawValue.Value();
        this.pathManager.__stepOutLiteral(node, (_path)=>{
        });
    }

    Number(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        node.type = estraverse.Syntax.Literal;
        node.value = rawValue.Number();
        this.pathManager.__stepOutLiteral(node, (_path)=>{
        });
    }

    String(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        node.type = estraverse.Syntax.Literal;
        node.value = rawValue.String();
        this.pathManager.__stepOutLiteral(node, (_path)=>{
        });
    }

    Null(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        node.type = estraverse.Syntax.Literal;
        node.value = rawValue.Null();
        this.pathManager.__stepOutLiteral(node, (_path)=>{
        });
    }

    Boolean(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);
        node.type = estraverse.Syntax.Literal;
        node.value = rawValue.Boolean();
        this.pathManager.__stepOutLiteral(node, (_path)=>{
        });
    }

    /**
     * 
     * get an identifier according this.state
     */
    Identifier(node, parent, pred){
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.Identifier;
        // TODO 
        let varibles = this.currentVaribles();

        do{
            if(this.state.newClass && /Class/.test(parent.type)){
                node.name = this.className();
                break;
            }

            if(this.state.newFunc && (/Function/.test(parent.type)||/Method/.test(parent.type))){
                node.name = this.functionName();
                break;
            }

            if(this.state.newParam && (/Function/.test(parent.type)||/Method/.test(parent.type) || /Catch/.test(parent.type))){
                node.name = this.parameterName();
                break;
            }

            if(this.state.isParam && (/AssignmentPattern/.test(parent.type)) && this.state.isLeft){
                node.name = this.parameterName();
                break;
            }

            if(this.state.newLabel && parent.type == estraverse.Syntax.LabeledStatement){
                node.name = this.labelName();
                break;
            }

            if(this.state.isProperty && parent.type == estraverse.Syntax.Property){
                node.name = this.propName();
                break;
            }

            if(this.state.newable && parent.type == estraverse.Syntax.VariableDeclarator){
                //console.log(parent);
                node.name = this.varName();
                break;
            }

            /**if(this.state.needProperty && parent.type == estraverse.Syntax.MemberExpression){
                console.log(parent);
                console.log(parent.object);
                let objValuetype  = this.pathManager.acquire(parent.object)._valueType;
                var valueinfo = this.currentValueTable().get(objValuetype.getSymIndex(0x74));
                node.name = random.randomElement([...valueinfo.getProps().keys()]);
                break;
            }*/

            if(this.state.needObject && parent.type == estraverse.Syntax.MemberExpression){
                var visitied = [];
                do{
                    var candi = random.randomElement(varibles);
                    visitied.push(candi)
                    if(visitied.length >= varibles.length){
                        console.log("wrong~")
                        break;
                    }
                    var valuetype = this.currentValueMap().get(candi);
                    if( !valuetype ) continue;
                    if(valuetype.type >= 0x10 || valuetype.type&0x0004) break;
                }while (true);
                node.name = candi;
                break;
            }

            if(this.state.needNumber && parent.type == estraverse.Syntax.UpdateExpression){
                var visitied = [];
                do{
                    var candi = random.randomElement(varibles);
                    visitied.push(candi)
                    if(visitied.length >= varibles.length)
                        break;
                    var valuetype = this.currentValueMap().get(candi);
                }while (valuetype && !(valuetype.type & 0x0002))
                node.name = candi;
                break;
            }

            if(this.state.needFunc && (parent.type == estraverse.Syntax.NewExpression || /Class/.test(parent.type))){
                // get a function
                node.name = random.randomElement(this.currentFunctions().concat(this.currentClasses()));
                break;
            }

            if(this.state.needFunc && (parent.type == estraverse.Syntax.CallExpression || parent.type == estraverse.Syntax.NewExpression || /Class/.test(parent.type))){
                // get a function
                node.name = random.randomElement(this.currentFunctions());
                break;
            }

            if(this.state.needFunc && (parent.type == estraverse.Syntax.BinaryExpression) && parent.operator == 'instanceOf'){
                // get a function
                node.name = random.randomElement(this.currentFunctions().concat(this.currentClasses()));
                break;
            }

            if(varibles.length==0){
                // create an global varible
                if (this.state.newable){
                    node.name = this.globalVaribleName();
                    this.currentScope().__define(node, new definition.Definition(variable.Variable, node.name, node, parent, 0, "var"));
                }else{
                    console.log('WRONG! No availiable varible');
                    throw 'error';
                }
            }else{
                node.name = random.randomElement(varibles);
            }
        }while(false)

        this.pathManager.__stepOutIdentifier(node,()=>{});
    }

    IfStatement(node, parent, pred){
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        var _this = this;
        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.IfStatement;
        var old_depth = this.state.depth;
        this.state.depth = Math.min(2,old_depth);
        node.test = this.build("Expression", node, node);
        this.state.depth = old_depth;
        node.consequent = this.build("BlockStatement", node, node.test);
        node.alternate = this.build(random.randomElement(["BlockStatement",null]),node,node.test);
        
        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.alternate);
            if(path)
                _path.update(path);
        });
    }

    LabeledStatement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepStatement(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.LabeledStatement;
        this.state.newLabel = true;
        node.label = this.build("Identifier", node, node);
        this.state.newLabel = false;
        node.body = this.build("Statement", node, node.label);

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.body);
            if(path)
                _path.update(path);
        });
    }

    /**
     * Normal Expression
     */
    LogicalExpression(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            random.randomElement([this.Literal,this.Identifier]).call(this,node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.LogicalExpression;
        node.operator = random.randomElement(variable.LOGICAL_OPERATORS);
        node.left = this.build("Expression", node, node);
        node.right = this.build("Expression", node, node);

        this.state.depth++;
        this.pathManager.__stepOutLogicalExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.left);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.right);
            if(path)
                _path.update(path);
        });
    }

    /**
     * 
     * something different for MemberExpression in diff place
     * TODO  make sure object is a object
     * make sure the property is meaningful
     */
    MemberExpression(node, parent, pred){
        if(this.state.depth <=0 ){
            if(this.state.needNumber)
                random.randomElement([this.Identifier]).call(this,node, parent, pred);
            else
                random.randomElement([this.Literal,this.Identifier]).call(this,node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.MemberExpression;
        node.computed = random.randomBool(0.3);
        this.state.needObject = true;
        node.object = this.build("Object", node, node);
        this.state.needObject = false;
        if (node.computed){
            node.property = this.build("Expression", node, node.object);
        }else{
            // TODO make sure this Identifier is accessible for 
            this.state.needProperty = true;
            node.property = this.build("Identifier", node, node.object);
            this.state.needProperty = false;
        }

        this.state.depth++;
        this.pathManager.__stepOutMemberExpression(node,(_path)=>{});
    }

    /**
     * Is there other?
     * new.target only avaiable in function
     */
    MetaProperty(node, parent, pred){
        var _this = this;
        if(!targetable()){
            this.Identifier(node, parent, pred);
            return;
        }

        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);
        
        node.type = estraverse.Syntax.MetaProperty;
        node.meta = this.build("NewToken", node, node);
        node.property = this.build("TargetToken", node, node.meta);

        function targetable(){
            let pathVisitor = _this.pathManager.acquire(parent);
            while(pathVisitor){
                if(pathVisitor.node.type == 'FunctionDeclaration' || pathVisitor.node.type == 'FunctionExpression'){
                    return true;
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
            return false;
        }

        this.pathManager.__stepOutStatement(node,()=>{
        });
    }

    /**
     * TODO : consider the call argument reference?
     */
    NewExpression(node, parent, pred){
        var _this =this;
        if(this.state.depth <=0 ){
            this.Identifier(node);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.NewExpression;
       
        this.state.needFunc = true;
        node.callee = this.build("CalleeExpression", node, node);
        this.state.needFunc = false;
        node.arguments = this.buildList(0,["Expression"], node, node.callee);

        this.state.depth++;
        this.pathManager.__stepOutNewExpression(node,(_path)=>{
            let path;
            for(let statement of node.arguments){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
            path = _this.pathManager.acquire(node.callee);
            _path.update(path);
        });
    }

    /**
     * TODO: Path ValueMap Analysis? 
     */
    ObjectExpression(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.Identifier(node, parent,pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ObjectExpression;
        node.properties = this.buildList(0,["Property"], node, node);

        this.state.depth++;
        this.pathManager.__stepOutObjectExpression(node, (_path)=>{
            let path;
            for(let statement of node.properties){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    ObjectPattern(node, parent, pred){
        var _this = this;
        if(this.state.depth <=3 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ObjectPattern;
        node.properties = this.buildList(1,["Property"],node, node);

        this.state.depth++;
        this.pathManager.__stepOutExpression(node, (_path)=>{
            let path;
            for(let statement of node.properties){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    /**
     * Property only aviable in ObjectExpression and ObjectPattern
     * Register property in scope
     * TODO Reference in property
     */
    Property(node, parent, pred){
        /**
         * Property need at least 2 depth,and Property can not be convert to a simple expression 
         */
        if(this.state.depth <=2 ){
            this.Identifier(node, parent, pred);
            node.type = estraverse.Syntax.Property;
            node.computed = false;
            node.kind = "init";
            this.state.isProperty = true;
            node.key = this.build("Identifier", node, node);
            this.state.isProperty = false;
            node.value = this.build("Expression", node, node.key);
            node.method = false;
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.Property;
        node.computed = random.randomBool();
        this.state.isProperty = true;
        if(node.computed){
            let old_depth = this.state.depth;
            this.state.depth = Math.min(2,old_depth);
            node.key = this.build("Expression", node, node);
            this.state.depth = old_depth;
        }else{
            node.key = this.build(random.randomElement(["Identifier","Literal"]), node, node);
        }
        this.state.isProperty = false;

        node.kind = random.randomElement(variable.PROPERTY_KINDS);
        node.method = random.randomBool();
        switch(node.kind){
            case 'set':
                this.state.setter = true;
                node.value = this.build("FunctionExpression", node, node.key);
                this.state.setter = false;
                break;
            case 'get':
                this.state.getter = true;
                node.value = this.build("FunctionExpression", node, node.key);
                this.state.getter = false;
                break;
            case 'init':
                if(node.method)
                    node.value = this.build("FunctionExpression", node, node.key);
                else
                    node.value = this.build("Expression", node, node.key);
                break;
        }

        this.state.depth++;
        this.pathManager.__stepOutProperty(node,()=>{});
    }

    PartternProperty(node, parent, pred){
        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.Property;
        node.computed = false;
        node.key = this.build(random.randomElement(["Identifier"]),node, node);
        node.kind = 'init';
        node.method = false;
        node.value = null;

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,()=>{});
    }


    Program(node, parent, pred){
        var _this = this;
        if(!this.state.depth){
            console.log("Wrong!");;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        this.scopeManager.__nestGlobalScope(node);

        node.type = estraverse.Syntax.Program;
        this.state.test = true;
        let stmt1 = this.build("VariableDeclaration",node, node);
        let stmt2 = this.build("VariableDeclaration",node, stmt1);
        this.state.test = false;
        let stmt3 = this.build("FunctionDeclaration",node, stmt2);
        node.body = [stmt1,stmt2,stmt3].concat(this.buildList(1,["Statement"],node, stmt3));

        this.state.depth++;
        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    /**
     * TODO ????
     */
    RestElement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.RestElement;
        node.argument = this.build("Identifier", node, node);

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }

    /**
     * 
     * SpreadElement can only be available in CallExpression ,ArrayExpression and ObjectExpression
     */
    SpreadElement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }

        if(!spreadable()){
            this.Expression(node, parent, pred);
            return;
        }

        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        console.log(parent.type);
        node.type = estraverse.Syntax.SpreadElement;
        node.argument = this.build("Identifier",node, node);

        this.state.depth++;

        function spreadable(){
            if(parent.type == estraverse.Syntax.CallExpression || parent.type == estraverse.Syntax.ArrayExpression || parent.type == estraverse.Syntax.ObjectExpression){
                return true;
            }
            return false;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }

    ReturnStatement(node, parent, pred){
        var _this =this;
        if(!returnable()){
            this.EmptyStatement(node, parent, pred);
            return
        }

        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.ReturnStatement;
        node.argument = this.build(random.randomElement(["Expression",null]), node, node);

        this.state.depth++;

        function returnable(){
            let pathVisitor = _this.pathManager.acquire(parent);
            while(pathVisitor){
                if(/Function/.test(pathVisitor.node.type)){
                    return true;
                }
                pathVisitor = _this.pathManager.acquire(pathVisitor.parent);
            }
            return false;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            if(path)
                _path.update(path);
        });
    }

    /**
     * SequenceExpression is not avaiable inside property key
     */
    SequenceExpression(node, parent, pred){
        var _this =this;
        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.SequenceExpression;
        node.expressions = this.buildList(2,["Expression"], node, node);

        this.state.depth++;

        this.pathManager.__stepOutSequenceExpression(node,(_path)=>{
            let path;
            for(let expression of node.expressions){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
    }

    Super(node, parent, pred){
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        node.type = estraverse.Syntax.Super;
        this.pathManager.__stepOutStatement(node,()=>{});
    }

    /**
     * SwitchStatement need at least 2 depth
     */
    SwitchStatement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=2 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.SwitchStatement;
        this.state.loopHead = true;
        var old_depth = this.state.depth;
        this.state.depth = Math.min(2,old_depth);
        node.discriminant = this.build("Expression",node,node);
        this.state.depth = old_depth;
        this.state.loopHead = false;

        this.scopeManager.__nestSwitchScope(node);
        node.cases = this.buildList(1,["SwitchCase"],node, node.discriminant);
        node.cases.push(this.build("DefaultCase",node,node.discriminant));

        this.close(node);
        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.discriminant);
            _path.update(path);
            for(let expression of node.cases){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
    }

    SwitchCase(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.SwitchCase;
        // TODO make sure this expression
        // Assignment can not be there
        node.test = this.build("Expression",node, node);
        node.consequent = this.buildList(1,["Statement"],node, node.test);
        // switchcase need break
        if(random.randomBool())
            node.consequent.push(this.build("BreakStatement",node, node.consequent));

        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            if(path)
                _path.update(path);
        });
    }

    DefaultCase(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.SwitchCase;
        // TODO make sure this expression
        // Assignment can not be there
        node.test = null;
        node.consequent = this.buildList(1,["Statement"], node, node);

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.consequent);
            _path.update(path);
        });
    }

    ThisExpression(node, parent, pred){
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        //this.updateCurrentScope(node);

        if(this.state.infunction){

            node.type = estraverse.Syntax.ThisExpression;
        }
        else{
            this.Identifier(node, parent, pred);
        }
        this.pathManager.__stepOutThisExpression(node,()=>{});
        
    }

    ThrowStatement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);
        //this.updateCurrentScope(node);

        node.type = estraverse.Syntax.ThrowStatement;
        node.argument = this.build("Expression", node, node);

        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }

    TryStatement(node, parent, pred){
        /*
        *  Try need at least two depth
        */

        var _this = this;
        if(this.state.depth <=1 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);
        //this.updateCurrentScope(node);

        node.type = estraverse.Syntax.TryStatement;
        this.state.cannotEmpty = true;
        node.block = this.build("BlockStatement", node, node);
        this.state.cannotEmpty = false;
        node.handler = this.build(random.randomElement([null,"CatchClause"]),node, node.block);
        this.state.cannotEmpty = true;
        node.finalizer = this.build(random.randomElement([null,"BlockStatement"]),node, node.block);
        this.state.cannotEmpty = false;
        if(!node.handler && !node.finalizer){
            if(random.randomBool()){
                node.handler = this.build("CatchClause", node, node.block);
            }
            else{
                this.state.cannotEmpty = true;
                node.finalizer = this.build("BlockStatement", node, node.block);
                this.state.cannotEmpty = false;
            }
        }

        this.state.depth++;

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.block);
            _path.update(path);
            path = _this.pathManager.acquire(node.handler);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.finalizer);
            if(path)
                _path.update(path);
        });
    }

    CatchClause(node, parent, pred){
        var _this9 = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.CatchClause;
        this.visitPattern(node.param, { processRightHandNodes: true }, function (pattern, info) {
            _this9.currentScope().__define(pattern, new definition.Definition(variable.CatchClause, node.param, node, null, null, null));
            _this9.referencingDefaultValue(pattern, info.assignments, null, true);
        });
        //this.resetParamCount();
        this.enableNewParam();
        node.param = this.build("Identifier", node, node);
        this.disableNewParam();

        this.scopeManager.__nestCatchScope(node);
        this.state.cannotEmpty = true;
        node.body = this.build("BlockStatement", node, node.param);
        this.state.cannotEmpty = false;

        this.close(node);
        this.state.depth++;

        this.pathManager.__stepOutCatchClause(node,(_path)=>{
            let path = _this9.pathManager.acquire(node.param);
            _path.update(path);
            path = _this9.pathManager.acquire(node.body);
            _path.update(path);
        });
    }

    UnaryExpression(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.UnaryExpression;
        node.argument = this.build("Expression",node, node);
        node.operator = random.randomElement(variable.UNARY_OPERATORS);

        this.state.depth++;
        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path, true);
        });
    }

    UpdateExpression(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.UpdateExpression;
        // node.argument = this.build("LHSPattern",node, node);
        this.state.needNumber = true;
        node.argument = this.build(random.randomElement(["Identifier","MemberExpression"]),node, node);
        this.state.needNumber = false;
        node.operator = random.randomElement(variable.UPDATE_OPERATORS);
        node.prefix = random.randomBool();

        this.currentScope().__referencing(node.argument, reference.RW, null);

        this.state.depth++;

        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }

    // WARNING !!!
    VariableDeclaration(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 && !this.state.forinHead){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.VariableDeclaration;
        node.kind = 'var';
        if(this.state.forinHead){
            node.declarations = this.buildListExact(1,["VariableDeclarator"], node, node);
        }else{
            node.declarations = this.buildList(1,["VariableDeclarator"], node, node);
        }

        this.state.depth++;

        this.pathManager.__stepOutVariableDeclaration(node,(_path)=>{

            for(let declaration of node.declarations){
                let path = _this.pathManager.acquire(declaration);
                _path.update(path);
            }
        });
    }

    VariableDeclarator(node, parent, pred){
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);
        //this.pathManager.updateCurrentScope(node);

        node.type = estraverse.Syntax.VariableDeclarator;
        this.state.newable = true;
        node.id = this.build("Identifier", node, node);
        this.state.newable = false;
        // do not do much job in for head
        if(this.state.forinHead){
            
            // in forin and forof head ,var can not init
            node.init = null;
            
        }else{
            let old_depth = this.state.depth;
            this.state.depth = 0;
            node.init = this.build(random.randomElement(["Expression","Expression",null]),node, node);
            this.state.depth = old_depth;
        }
        

        //regester varible in current scope
        this.currentScope().__define(node.id, new definition.Definition(variable.Variable, node.id.name, node.id, node, 0, "var"));

        //this.pathManager.close(node);
        this.pathManager.__stepOutVariableDeclarator(node, ()=>{});
    }

    /**
     * TODO make sure it is not a dead loop
     */
    WhileStatement(node, parent, pred){
        var _this = this;
        // used to reduce the posibiity of Forin
        if(random.randomBool()){
            this.Statement(node, parent, pred);
            return;
        }

        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.WhileStatement;
        this.state.loopHead = true;
        var old_depth = this.state.depth;
        this.state.old_depth = Math.min(2,old_depth);
        node.test = this.build("Expression", node ,node);
        this.state.depth = old_depth;
        this.state.loopHead = false;
        node.body = this.build("BlockStatement", node, node.test);

        this.state.depth++;

        this.pathManager.__stepOutStatement(node, (_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
    }

    WithStatement(node, parent, pred){
        var _this = this;
        if(this.state.depth <=0 ){
            this.EmptyStatement(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.WithStatement;
        this.state.isParam = true;
        node.object = this.build("Expression", node, node);
        this.state.isParam = false;

        this.scopeManager.__nestWithScope(node);
        node.body = this.build("BlockStatement",node, node.object);

        this.close(node);
        this.state.depth++;
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.object);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
    }

    YieldExpression(node, parent, pred){
        var _this = this;
        if(!yieldable()){
            this.Identifier(node, parent, pred);
            return;
        }

        if(this.state.depth <=0 ){
            this.Identifier(node, parent, pred);
            return;
        }
        this.state.depth--;
        this.pathManager.__stepExpression(node, this.currentScope(), parent, pred);

        node.type = estraverse.Syntax.YieldExpression;
        node.delegate = random.randomBool();
        // if delegate is true, argument can not be null
        if(node.delegate){
            node.argument = this.build("Expression",node, node);
        }else{
            node.argument = this.build(random.randomElement([null,"Expression"]),node,node);
        }

        this.state.depth++;

        function yieldable(){
            let scopeVisitor = _this.currentScope()
            while(scopeVisitor){
                if(scopeVisitor.type == 'function' && scopeVisitor.block.generator){
                    return true;
                }
                scopeVisitor = scopeVisitor.upper;
            }
            return false;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }

}

exports.default = Builder;
