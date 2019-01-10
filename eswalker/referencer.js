var esrecurse = require('./esrecurse');
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
        this.__currentScope = null;
        this.scopeManager = scopeManager;
        this.pathManager = pathManager;
        this.predcessor = null;
        this.isInnerMethodDefinition = false;
        this.__currentValueMap = new Map();
    }

    updateCurrentScope(node){
        if(/Program/.test(node.type) || /Function/.test(node.type) || /ClassDeclaration/.test(node.type)|| /For/.test(node.type) || /While/.test(node.type) || /Catch/.test(node.type) || /Switch/.test(node.type) || /Block/.test(node.type)){
            let scope = this.scopeManager.acquire(node);
            if(scope)
                this.__currentScope = scope;
        }
    }

    close(node){
        while (this.currentScope() && node === this.currentScope().block) {
            this.__currentScope = this.currentScope().upper;
        }
    }


    globalScope(){
        return this.scopeManager.globalScope;
    }

    currentScope(){
        return this.__currentScope;
    }

    /**
     * 
     * PathManager needed
     */

    currentPath(){
        return this.pathManager.__currentPath;
    }

    currentValueMap(){
        return this.__currentValueMap;
    }

    /**
     * 
     *  Visitor for each expression and statement
     */

    Program(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepStatement(node,this.currentScope(),parent,pred);

        // TODO can not use visitChildren directly

        let predNode = node;
        for(let statement of node.body){
            this.visit(statement,node,predNode);
            predNode = statement;
        }

        // Program's Valueinfo is merge of all its body statement
        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });

        this.close(node);
    }

    BlockStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepStatement(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let statement of node.body){
            this.visit(statement,node,predNode);
            predNode = statement;
        }
        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
        this.close(node);
    }

    AssignmentExpression(node, parent, pred) {
        let _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);

        this.pathManager.__stepOutAssignmentExpression(node,(_path)=>{});
    }

    AssignmentPattern(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);

        this.pathManager.__stepOutAssignmentPattern(node,(_this)=>{});
        this.close(node);
    }

    ArrayExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let expression of node.elements){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            for(let expression of node.elements){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
        this.close(node);
    }

    ArrayPattern(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let expression of node.elements){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            for(let expression of node.elements){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
        }});
        this.close(node);
    }

    ArrowFunctionExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let expression of node.params){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.visit(node.body,node,predNode);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            for(let expression of node.params){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
    
            let path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
        this.close(node);
    }

    AwaitExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }

    BinaryExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.right);
            _path.update(path);
            path = _this.pathManager.acquire(node.left);
            _path.update(path);
        });
        this.close(node);
    }

    BreakStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.label,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
        });
        this.close(node);
    }

    // TODO : notify callee?
    CallExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let expression of node.arguments){
            this.visit(expression,node,predNode);
            predNode = expression;
        }
        this.visit(node.callee,node,predNode);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path;
            for(let expression of node.arguments){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
            path = _this.pathManager.acquire(node.callee);
            _path.update(path);
        });
        this.close(node);
    }

    CatchClause(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.param,node,node);
        this.visit(node.body,node,node.param);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.param);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
        this.close(node);
    }
    ClassBody(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let statement of node.body){
            this.visit(statement,node,predNode);
            predNode = statement;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
        this.close(node);
    }
    ClassDeclaration(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.id,node,node);
        this.visit(node.superClass,node,node.id);
        let predNode = node.superClass;
        this.visit(node.body,node,predNode);

        /**
         * ignore the value inside the class body
         */
        this.pathManager.__stepOutClassDeclaration(node, ()=>{});
        this.close(node);
    }
    ClassExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.id,node,node);
        this.visit(node.superClass,node,node);
        let predNode = node.id;
        this.visit(node.body,node,predNode);

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
        this.close(node);
    }
    ConditionalExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.test,node,node);
        this.visit(node.consequent,node,node.test);
        this.visit(node.alternate,node,node.test);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            _path.update(path);
            path = _this.pathManager.acquire(node.alternate);
            _path.update(path);
        });
        this.close(node);
    }
    ContinueStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.label,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
        });
        this.close(node);
    }
    DoWhileStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.body,node,node);
        this.visit(node.test,node,node.body);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.body);
            _path.update(path);
            path = _this.pathManager.acquire(node.test);
            _path.update(path);
        });
        this.close(node);
    }
    EmptyStatement(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.pathManager.__stepOutStatement(node,()=>{});
        this.close(node);
    }

    /**
     * ExpressionStatement will not do any job
     */
    ExpressionStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.expression,node,node);

        this.pathManager.__stepOutExpression(node,(_path)=>{
                let path = _this.pathManager.acquire(node.expression);
                _path.update(path);
        });
        this.close(node);
    }
    ForStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.init,node,node);
        this.visit(node.test,node,node.init);
        this.visit(node.body,node,node.test);
        this.visit(node.update,node,node.body);

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
        this.close(node);
    }
    ForInStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);
        let predNode = node.left;
        this.visit(node.body,node,predNode);

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
        this.close(node);
    }
    ForOfStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);
        let predNode = node.left;
        this.visit(node.body,node,predNode);

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
        this.close(node);
    }
    FunctionDeclaration(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.id,node,node);
        let predNode = node.id;
        for(let statement of node.params){
            this.visit(statement,node,predNode);
            predNode = statement;
        }
        this.visit(node.body,node,predNode);

        /**
         * ignore the node inside the body
         */
        this.pathManager.__stepOutFunctionDeclaration(node,()=>{});
        this.close(node);
    }
    FunctionExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.id,node,node);
        let predNode = node.id;
        for(let statement of node.params){
            this.visit(statement,node,predNode);
            predNode = statement;
        }
        this.visit(node.body,node,predNode);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.id);
            if(path)
                _path.update(path);
            for(let statement of node.params){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
        this.close(node);
    }
    /**
     * TODO
     */
    Identifier(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.pathManager.__stepOutIdentifier(node,()=>{});
        this.close(node);
    }
    IfStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.test,node,node);
        this.visit(consequent,node,node.test);
        this.visit(alternate,node,node.test);

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
        this.close(node);
    }
    Literal(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.pathManager.__stepOutExpression(node, ()=>{});
        this.close(node);
    }
    LabeledStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.label,node,node);
        let predNode = node.label;
        this.visit(node.body,node,predNode);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.body);
            if(path)
                _path.update(path);
        });
        this.close(node);
    }
    LogicalExpression(node, parent, pred) {
        var _this = this
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.left,node,node);
        this.visit(node.right,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.left);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.right);
            if(path)
                _path.update(path);
        });
        this.close(node);
    }

    /**
     * 
     * TODO
     */
    MemberExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.object,node,node);
        this.visit(node.property,node,node.object);

        this.pathManager.__stepOutStatement(node,(_path)=>{
        });
        this.close(node);
    }

    /**
     * do nothing
     */
    MetaProperty(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.meta,node,node);
        this.visit(node.property,node,node.meta);

        this.pathManager.__stepOutStatement(node,()=>{
        });
        this.close(node);
    }

    // TODO
    MethodDefinition(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.key,node,node);
        this.visit(node.value,node,node);

        this.pathManager.__stepOutStatement(node,()=>{});
        this.close(node);
    }

    // TODO
    NewExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let statement of node.arguments){
            this.visit(statement,node,node);
            predNode = statement;
        }
        this.visit(node.callee,node,predNode);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path;
            for(let statement of node.arguments){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
            path = _this.pathManager.acquire(node.callee);
            _path.update(path);
        });
        this.close(node);
    }

    // TODO
    ObjectExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        for(let statement of node.properties){
            this.visit(statement,node,node);
        }

        /**
         * can only del with simple 
         */
        this.pathManager.__stepOutExpression(node, (_path)=>{
            let path;
            for(let statement of node.properties){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
        this.close(node);
    }

    // TODO : consider when it inside param
    ObjectPattern(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        for(let statement of node.properties){
            this.visit(statement,node,node);
        }

        this.pathManager.__stepOutExpression(node, (_path)=>{
            let path;
            for(let statement of node.properties){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
        this.close(node);
    }

    // TODO
    Property(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.key,node,node);
        this.visit(node.value,node,node);

        this.pathManager.__stepOutStatement(node,()=>{});
        this.close(node);
    }
    RestElement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }
    ReturnStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            if(path)
                _path.update(path);
        });
        this.close(node);
    }
    SequenceExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let expression of node.expressions){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path;
            for(let expression of node.expressions){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
        this.close(node);
    }
    SpreadElement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }
    Super(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.pathManager.__stepOutStatement(node,()=>{});
        this.close(node);
    }
    SwitchStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.discriminant,node,node);
        let predNode = node.discriminant;
        for(let _case of node.cases){
            this.visit(_case,node,predNode);
        }
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.discriminant);
            _path.update(path);
            for(let expression of node.cases){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
        this.close(node);
    }
    SwitchCase(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.test,node,node);
        this.visit(node.consequent,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            _path.update(path);
        });
        this.close(node);
    }
    ThisExpression(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.pathManager.__stepOutStatement(node,()=>{});
        this.close(node);
    }
    ThrowStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }
    TryStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.block,node,node);
        this.visit(node.handler,node,node.block);
        this.visit(node.finalizer,node,node.block);

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
        this.close(node);
    }
    UnaryExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }
    UpdateExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }


    VariableDeclaration(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        let predNode = node;
        for(let declaration of node.declarations){
            this.visit(declaration,node,predNode);
        }

        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let declaration of node.declarations){
                let path = _this.pathManager.acquire(declaration);
                _path.update(path);
            }
        });
        this.close(node);
    }

    /**
     * VaribleDeclarator will add identifier into valueMap
     */
    VariableDeclarator(node, parent, pred) {
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.id,node,node);
        this.visit(node.init,node,node);

        // TODO : can only deal with the simple situation
        //      var a = 1;
        //      var b = 2;
        //      var c = expression
        this.pathManager.__stepOutVariableDeclarator(node, ()=>{});
        this.close(node);
    }

    WhileStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.test,node,node);
        let predNode = node.test;
        this.visit(node.body,node,predNode);

        this.pathManager.__stepOutExpression(node, (_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
        this.close(node);
    }
    WithStatement(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.object,node,node);
        let predNode = node.object;
        this.visit(node.body,node,predNode);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.object);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
        this.close(node);
    }
    YieldExpression(node, parent, pred) {
        var _this = this;
        this.updateCurrentScope(node);
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);

        this.visit(node.argument,node,node);

        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
        this.close(node);
    }
}

module.exports = Referencer;