void function () {
    var random = require('../random');
    var Copy = require("../utils").copy;
    var Statement = require('../classes/Statement');
    var Expresion = require('../classes/Expression');

    let statements = [
        "BlockStatement",
        "BreakStatement",
        "ContinueStatement",
        "DebuggerStatement",
        "DoWhileStatement",
        "EmptyStatement",
        "ExpressionStatement",
        "ForInStatement",
        "ForStatement",
        "FunctionDeclaration",
        "IfStatement",
        "LabeledStatement",
        "ReturnStatement",
        "SwitchStatement",
        "ThrowStatement",
        "TryStatement",
        "VariableDeclaration",
        "WhileStatement",
        "WithStatement",
        "ClassDeclaratio"
    ]

    let simple_control_statement = [
        require('../nodes/DoWhileStatement'),
        require('../nodes/WhileStatement'),
        require('../nodes/ForStatement'),
        require('../nodes/IfStatement')
    ];

    exports.extendMutator = SimpleExtendMutator;

    /*
        Extend statment to simple control statement
    */
    function SimpleExtendMutator(node, control_param){

        if( in$(node["type"], statements) ){ // only extend statement

            let statement = oneOf(simple_control_statement)(2,0, node["scopeVaribles"].length?node["scopeVaribles"]:null,node); // only onestage control 
            //console.log(dump(statement));
        
            return statement;
        } else {
            return node;
        }
    }

    function in$(member, list) {
      for (var i = 0, length = list.length; i < length; ++i)
        if (i in list && list[i] === member)
          return true;
      return false;
    }

    
}.call(this);