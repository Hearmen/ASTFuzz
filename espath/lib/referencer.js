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
        this.pathManager.__stepStatement(node,this.currentScope(),parent,pred);
        this.updateCurrentScope(node);

        // TODO can not use visitChildren directly

        let predNode = node;
        for(let statement of node.body){
            this.visit(statement,node,predNode);
            predNode = statement;
        }

        this.close(node);
        // Program's Valueinfo is merge of all its body statement
        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });

    }

    BlockStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepStatement(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let statement of node.body){
            this.visit(statement,node,predNode);
            predNode = statement;
        }
        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{

            for(let statement of node.body){
                let path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    AssignmentExpression(node, parent, pred) {
        let _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);

        this.close(node);
        this.pathManager.__stepOutAssignmentExpression(node,(_path)=>{});
    }

    AssignmentPattern(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);

        this.close(node);
        this.pathManager.__stepOutAssignmentPattern(node,(_this)=>{});
    }

    ArrayExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let expression of node.elements){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.close(node);
        this.pathManager.__stepOutArrayExpression(node,(_path)=>{
            for(let expression of node.elements){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
    }

    ArrayPattern(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let expression of node.elements){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.close(node);
        this.pathManager.__stepOutExpression(node,(_path)=>{
            for(let expression of node.elements){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
        }});
    }

    ArrowFunctionExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let expression of node.params){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.visit(node.body,node,predNode);

        this.close(node);
        this.pathManager.__stepOutFunctionExpression(node,(_path)=>{
            for(let expression of node.params){
                let path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
    
            let path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
    }

    AwaitExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.argument)
            this.visit(node.argument,node,predNode);

        this.close(node);
        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path, true);
        });
    }

    BinaryExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.right){
            this.visit(node.right,node,predNode);
            predNode = node.right;
        }
        if(node.left){
            this.visit(node.left,node,predNode);
            predNode = node.left;
        }

        this.close(node);
        this.pathManager.__stepOutBinaryExpression(node,(_path)=>{});
    }

    BreakStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.label,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
        });
    }

    // TODO : notify callee?
    CallExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let expression of node.arguments){
            this.visit(expression,node,predNode);
            predNode = expression;
        }
        this.visit(node.callee,node,predNode);

        this.close(node);
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

    CatchClause(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.param){
            this.visit(node.param,node,predNode);
            predNode = node.param;
        }
        if(node.body){
            this.visit(node.body,node,predNode);
            predNode = node.body;
        }

        this.close(node);
        this.pathManager.__stepOutCatchClause(node,(_path)=>{
            let path = _this.pathManager.acquire(node.param);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
    }
    ClassBody(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let statement of node.body){
            this.visit(statement,node,predNode);
            predNode = statement;
        }

        this.close(node);
        this.pathManager.__stepOutClassBody(node,(_path)=>{});
    }
    ClassDeclaration(node, parent, pred) {
        let predNode;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        predNode = node;
        if(node.id){
            this.visit(node.id,node,predNode);
            predNode = node.id;
        }
        if(node.superClass){
            this.visit(node.superClass,node,predNode);
            predNode = node.superClass;
        }
        this.visit(node.body,node,predNode);

        this.close(node);
        /**
         * ignore the value inside the class body
         */
        this.pathManager.__stepOutClassDeclaration(node, ()=>{});
    }
    ClassExpression(node, parent, pred) {
        let predNode;
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        predNode = node;
        if(node.id){
            this.visit(node.id,node,predNode);
            predNode = node.id;
        }
        if(node.superClass){
            this.visit(node.superClass,node,predNode);
            predNode = node.superClass;
        }
        this.visit(node.body,node,predNode);

        this.close(node);
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
    ConditionalExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.test){
            this.visit(node.test,node,predNode);
            predNode = node.test;
        }
        if(node.consequent){
            this.visit(node.consequent,node,predNode);
            predNode = node.consequent;
        }
        this.visit(node.alternate,node,predNode);

        this.close(node);
        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            _path.update(path, true);
            path = _this.pathManager.acquire(node.alternate);
            _path.update(path, true);
        });
    }
    ContinueStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.label,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
        });
    }
    DoWhileStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.body,node,node);
        this.visit(node.test,node,node.body);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.body);
            _path.update(path);
            path = _this.pathManager.acquire(node.test);
            _path.update(path);
        });
    }
    EmptyStatement(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);
        this.close(node);
        this.pathManager.__stepOutStatement(node,()=>{});
    }

    /**
     * ExpressionStatement will not do any job
     */
    ExpressionStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.expression,node,node);

        this.close(node);
        this.pathManager.__stepOutExpression(node,(_path)=>{
                let path = _this.pathManager.acquire(node.expression);
                _path.update(path);
        });
    }
    ForStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.init){
            this.visit(node.init,node,predNode);
            predNode = node.init;
        }
        if(node.test){
            this.visit(node.test,node,predNode);
            predNode = node.test;
        }
        if(node.body){
            this.visit(node.body,node,predNode);
            predNode = node.body;
        }
        if(node.update){
            this.visit(node.update,node,predNode);
            predNode = node.update;
        }
        

        this.close(node);
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
    ForInStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);
        let predNode = node.left;
        this.visit(node.body,node,predNode);

        this.close(node);
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
    ForOfStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.right,node,node);
        this.visit(node.left,node,node.right);
        let predNode = node.left;
        this.visit(node.body,node,predNode);

        this.close(node);
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
    FunctionDeclaration(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

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
        this.close(node);
        this.pathManager.__stepOutFunctionDeclaration(node,()=>{});
    }
    FunctionExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.id){
            this.visit(node.id,node,node);
            predNode = node.id;
        }
        for(let statement of node.params){
            this.visit(statement,node,predNode);
            predNode = statement;
        }
        this.visit(node.body,node,predNode);

        this.close(node);
        this.pathManager.__stepOutFunctionExpression(node,(_path)=>{
        });
    }
    /**
     * TODO
     */
    Identifier(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);
        this.close(node);
        this.pathManager.__stepOutIdentifier(node,()=>{});
    }
    IfStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        if(node.test){
            this.visit(node.test,node,predNode);
            predNode = node.test;
        }
        if(node.consequent){
            this.visit(node.consequent,node,predNode);
        }
        if(node.alternate){
            this.visit(node.alternate,node,predNode);
        }

        this.close(node);
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
    Literal(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);
        this.close(node);
        this.pathManager.__stepOutLiteral(node, (_path)=>{
        });
    }
    LabeledStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.label,node,node);
        let predNode = node.label;
        this.visit(node.body,node,predNode);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.label);
            if(path)
                _path.update(path);
            path = _this.pathManager.acquire(node.body);
            if(path)
                _path.update(path);
        });
    }
    LogicalExpression(node, parent, pred) {
        var _this = this
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.left,node,node);
        this.visit(node.right,node,node);

        this.close(node);
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
     * TODO
     */
    MemberExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.object,node,node);
        this.pathManager.__stepFurtherExpression(node.object);    // 遍历需要两步
        this.visit(node.property,node,node.object);

        this.close(node);
        this.pathManager.__stepOutMemberExpression(node,(_path)=>{});
    }

    /**
     * do nothing
     */
    MetaProperty(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.meta,node,node);
        this.visit(node.property,node,node.meta);

        this.close(node);
        this.pathManager.__stepOutStatement(node,()=>{
        });
    }

    // TODO
    MethodDefinition(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.key,node,node);
        this.visit(node.value,node,node);

        this.close(node);
        this.pathManager.__stepOutMethodDefinition(node,()=>{});
    }

    // TODO
    NewExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let statement of node.arguments){
            this.visit(statement,node,node);
            predNode = statement;
        }
        this.visit(node.callee,node,predNode);

        this.close(node);
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

    // TODO
    ObjectExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepObjectExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        for(let statement of node.properties){
            this.visit(statement,node,node);
        }

        /**
         * can only del with simple 
         */
        this.close(node);
        this.pathManager.__stepOutObjectExpression(node, (_path)=>{
            let path;
            for(let statement of node.properties){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    // TODO : consider when it inside param
    ObjectPattern(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        for(let statement of node.properties){
            this.visit(statement,node,node);
        }

        this.close(node);
        this.pathManager.__stepOutExpression(node, (_path)=>{
            let path;
            for(let statement of node.properties){
                path = _this.pathManager.acquire(statement);
                _path.update(path);
            }
        });
    }

    // TODO
    Property(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.key,node,node);
        this.visit(node.value,node,node);

        this.close(node);
        this.pathManager.__stepOutProperty(node,()=>{});
    }
    RestElement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }
    ReturnStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            if(path){
                _path.update(path);
                _path._valueType = path._valueType;
            }
        });
    }
    SequenceExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let expression of node.expressions){
            this.visit(expression,node,predNode);
            predNode = expression;
        }

        this.close(node);
        this.pathManager.__stepOutSequenceExpression(node,(_path)=>{
            let path;
            for(let expression of node.expressions){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
    }
    SpreadElement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }
    Super(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);
        this.close(node);
        this.pathManager.__stepOutStatement(node,()=>{});
    }
    SwitchStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.discriminant,node,node);
        let predNode = node.discriminant;
        for(let _case of node.cases){
            this.visit(_case,node,predNode);
            predNode = _case;
        }
        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.discriminant);
            _path.update(path);
            for(let expression of node.cases){
                path = _this.pathManager.acquire(expression);
                _path.update(path);
            }
        });
    }
    SwitchCase(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.test,node,node);
        let predNode = node.test;
        for(let statement of node.consequent){
            this.visit(statement,node,predNode);
            predNode = statement;
        }

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.consequent);
            _path.update(path);
        });
    }
    ThisExpression(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);
        this.close(node);
        this.pathManager.__stepOutThisExpression(node,()=>{});
    }
    ThrowStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }
    TryStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        var predNode = node;
        this.visit(node.block,node,predNode);
        predNode = node.block;
        if(node.handler){
            this.visit(node.handler,node,predNode);
            predNode = node.handler;
        }
        this.visit(node.finalizer,node,predNode);

        this.close(node);
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
    UnaryExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path, true);
        });
    }
    UpdateExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutExpression(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path);
        });
    }


    VariableDeclaration(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        let predNode = node;
        for(let declaration of node.declarations){
            this.visit(declaration,node,predNode);
        }
        
        this.close(node);
        this.pathManager.__stepOutVariableDeclaration(node,(_path)=>{

            for(let declaration of node.declarations){
                let path = _this.pathManager.acquire(declaration);
                _path.update(path);
            }
        });
    }

    /**
     * VaribleDeclarator will add identifier into valueMap
     */
    VariableDeclarator(node, parent, pred) {
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.id,node,node);
        this.visit(node.init,node,node);

        // TODO : can only deal with the simple situation
        //      var a = 1;
        //      var b = 2;
        //      var c = expression
        this.close(node);
        this.pathManager.__stepOutVariableDeclarator(node, ()=>{});
    }

    WhileStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.test,node,node);
        let predNode = node.test;
        this.visit(node.body,node,predNode);

        this.close(node);
        this.pathManager.__stepOutStatement(node, (_path)=>{
            let path = _this.pathManager.acquire(node.test);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
    }
    WithStatement(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepStatement(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.object,node,node);
        let predNode = node.object;
        this.pathManager.__stepFurtherExpression(predNode);    // 遍历需要两步
        this.visit(node.body,node,predNode);

        this.close(node);
        this.pathManager.__stepOutWithStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.object);
            _path.update(path);
            path = _this.pathManager.acquire(node.body);
            _path.update(path);
        });
    }
    YieldExpression(node, parent, pred) {
        var _this = this;
        this.pathManager.__stepExpression(node,this.currentScope(),parent, pred);
        this.updateCurrentScope(node);

        this.visit(node.argument,node,node);

        this.close(node);
        this.pathManager.__stepOutStatement(node,(_path)=>{
            let path = _this.pathManager.acquire(node.argument);
            _path.update(path,true);
        });
    }
}

module.exports = Referencer;