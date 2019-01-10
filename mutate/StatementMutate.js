void function () {
    random = require('../random');
    cache$ = require('../combinators');
    oneOf = cache$.oneOf;
    cache$ = require('../utils.js');
    dump = cache$.dump;


    var reduce = require("./ReduceStatement.js");
    var ProgramStatement = require("../nodes/Program.js");

    var Statement = require("../classes/Statement.js");

    var ForInStatement = require("../nodes/ForInStatement.js");
    var DoWhileStatement = require("../nodes/DoWhileStatement.js");
    var SwitchStatement = require("../nodes/SwitchStatement.js");
    var WhileStatement = require("../nodes/WhileStatement.js");
    var WithStatement = require("../nodes/WithStatement.js");
    var ForStatement = require("../nodes/ForStatement.js");
    var IfStatement = require("../nodes/IfStatement.js");

    module.exports.reduceStatement = StatementReduce;
    module.exports.extendStatement = StatementExtend;
    module.exports.replaceStatement = StatementReplace;
    module.exports.heritExtendStatement = StatementHeritExtend;
    
    /*
	StatementReduce: Reduce the complex statement to simple block statement
    */
    function StatementReduce(node){
        let block_node;
        switch(node["type"]){
            case "ForStatement":  block_node = reduce.reduceForStatement(node); break;
            case "ForInStatement": block_node = reduce.reduceForInStatement(node); break;
            case "IfStatement": block_node = reduce.reduceIfStatement(node); break;
            case "DoWhileStatement": block_node = reduce.reduceDoWhileStatement(node); break;
            case "SwitchStatement": block_node = reduce.reduceSwitchStatement(node); break;
            case "WhileStatement": block_node = reduce.reduceWhileStatement(node); break;
            case "WithStatement": block_node = reduce.reduceWithStatement(node); break;
            default :  block_node = node; break;
        }
        return block_node;
    }

    /*
	StatementExtend:  Extend Simple Statement Node to Complex struct node 
		SimpleNode : BreakStatement,EmptyStatement,ExpressionStatement,ContinueStatement,ThrowStatement,LabelStatement
		ComplexNode : DoWhileStatement,ForInStatement,ForStatement,IfStatement,SwtichStatement,TryStatement,WhileStatement,WithStement,
		ExpressionStatement => ForStatement { ExpressionStatement }
		ExpressionStatement => IfStatement { ExpressionStatement }
        ExpressionStatement => SwitchStatement { ExpressionStatement }
    
    Stretage One: Random generate , may have no sence
    */
    function StatementExtend(node){
        //var for_statement = ForStatement(3, 0, node);
        var statement = oneOf([ForInStatement,DoWhileStatement,SwitchStatement,WhileStatement,WithStatement,ForStatement,IfStatement])(2,0, null,node);
        //console.log(dump(statement));
    
        return statement;
    }

    /*
     Stretage Two:   Herit mutate, 
    */
    function StatementHeritExtend(node){
        let scope = node["scopeVaribles"];
        if (scope.length > 0)
            var statement = oneOf([ForInStatement,DoWhileStatement,SwitchStatement,WhileStatement,WithStatement,ForStatement,IfStatement])(2,0, scope, node);
        //console.log(dump(statement));
        else
            var statement = oneOf([ForInStatement,DoWhileStatement,SwitchStatement,WhileStatement,WithStatement,ForStatement,IfStatement])(2,0, null, node);
    
        return statement;
    }

    /*
     Replace one statement to another one 
    */
    function StatementReplace(node){
        var statement =  Statement(3, 0, node["scopeVaribles"]);
        return statement;
    }
    
}.call(this);
  