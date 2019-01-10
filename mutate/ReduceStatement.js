void function (){

    cache$ = require('../random');
    randomElement = cache$.randomElement;
    cache$ = require('../combinators');
    oneOf = cache$.oneOf;
    maybe = cache$.maybe;
    EmptyStatement = require('../nodes/EmptyStatement');

    module.exports.reduceForStatement = ReduceForStatement;
    module.exports.reduceForInStatement = ReduceForInStatement;
    module.exports.reduceIfStatement = ReduceIfStatement;
    module.exports.reduceDoWhileStatement = ReduceDoWhileStatement;
    module.exports.reduceSwitchStatement = ReduceSwitchStatement;
    module.exports.reduceWhileStatement = ReduceWhileStatement;
    module.exports.reduceWithStatement = ReduceWithStatement;

    function ReduceForStatement(node){
        if(node["type"] != "ForStatement")
            return;
        
        let init_statement = node["init"];
        let body_statements = node["body"];
        let block_statement = {type:"BlockStatement",body:[init_statement]};

        block_statement["body"].push(body_statements);
        return block_statement;
    }

    /*
        ForIn reduce may not make scence
    */
    function ReduceForInStatement(node){
        if(node["type"] != "ForInStatement")
            return;

        let left_statement = node["left"];
        let body_statements = node["body"];
        let block_statement = {type:"BlockStatement",body:[left_statement]};

        block_statement["body"].push(body_statements);
        return block_statement;
    }

    function ReduceIfStatement(node){
        if(node["type"] != "IfStatement")
            return;
        
        let test_statement = node["test"];
        let consequent_statement = node["consequent"];
        let alternate_statement = node["alternate"];
        let block_statement = {type:"BlockStatement",body:[]};

        if(alternate_statement)
            block_statement["body"].push(randomElement([consequent_statement,alternate_statement]));
        else
            block_statement["body"].push(consequent_statement);

        return block_statement;
    }

    function ReduceDoWhileStatement(node){
        if(node["type"] != "DoWhileStatement")
            return;

        let test_statement = node["test"];
        let body_statement = node["body"];
        let block_statement = {type:"BlockStatement",body:[]};

        block_statement["body"].push(body_statement);

        return block_statement;
    }

    function ReduceSwitchStatement(node){
        if(node["type"] != "SwitchStatement")
            return;
        
        let discriminant_statement = node["discriminant"];
        let cases_statements = node["cases"];
        let block_statement = {type:"BlockStatement",body:[]};

        block_statement["body"] = [].concat(randomElement(cases_statements.map(x=>x["consequent"])));

        //block_statement["body"] = [].concat(randomElement(cases_statements).map(x=>x["consequent"]));
        block_statement["body"]  = filter(block_statement["body"] );

        return block_statement;
    }

    function ReduceWhileStatement(node){
        if(node["type"] != "WhileStatement")
            return;

        let test_statement = node["test"];
        let body_statement = node["body"];
        let block_statement = {type:"BlockStatement",body:[]};

        block_statement["body"].push(body_statement);

        return block_statement;
    }


    /*
        Reduce with statement may have no sence
    */
    function ReduceWithStatement(node){
        if(node["type"] != "WithStatement")
            return;

        let object_expression = node["object"];
        let body_statement = node["body"];
        let block_statement = {type:"BlockStatement",body:[]};

        block_statement["body"].push(body_statement);

        return block_statement;
    }

    function filter(node){
        if (node == null)
            return;
        var isArray = Array.isArray(node); 
        let shadow = isArray?[]:{};

        if (["BreakStatement","DebuggerStatement","ContinueStatement"].indexOf(node['type']) > -1){
            //return (random.randomInt(control_param)!=0)?mutator(node):node;
            return EmptyStatement(0);
        }

        for (key in node){
            if (key == 'loc')
                continue;
            if (typeof node[key] == "object"){
                shadow[key] = filter(node[key]);
            }
            else{
                shadow[key] = node[key];
            }
        }
        return shadow;
    }

}.call(this)