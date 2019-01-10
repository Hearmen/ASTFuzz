void function () {
    random = require('../random');
    cache$ = require('../combinators');
    oneOf = cache$.oneOf;

    simpleMutate = require("./SimpleMutate.js");
    Expression = require('../classes/Expression');

    var reduce = require("./ReduceStatement.js");
    var ProgramStatement = require("../nodes/Program.js");

    module.exports.exprReplace = ExpressionReplace;
    module.exports.exprValueReplace = ExpressionValueReplace;
    module.exports.exprOperatorReplace = ExpressionOperatorReplace;
    module.exports.exprDeclareReplace = DeclareExpressionReplace;

    /*
        Expression Mutate include Expression Replace , value mutate, and operator replace
    */

    /*

    */
    function ExpressionReplace(expr_node,scope){
        if(scope)
            return Expression(depth, ancestors, null, scope);
        else
            return Expression(depth, ancestors);
    }

    function DeclareExpressionReplace(expr_node){
        if (node["type"] != 'LogicalExpression')
            return; 
    }

    function ExpressionValueReplace(expr_node){}

    function ExpressionOperatorReplace(expr_node){}


}.call(this);
