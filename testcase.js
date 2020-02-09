var child_process = require('child_process');
var escodegen = require('escodegen');
var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var espath = require('./espath/lib');
var random = require('./random');

var generator = require('./esbuilder');
var sleep = require('system-sleep');

var rf=require("fs");

console.log = function() {}

var tmpfile = "/dev/shm/r"+process.pid+".js"
/**
 * 
 * Tools function while mutate and generate 
 */
function scopable(node){
    if(node.noScope){
        return false;
    }
    if(/Function/.test(node.type) || /ClassDeclaration/.test(node.type)|| /For/.test(node.type) || /While/.test(node.type) || /Catch/.test(node.type) || /Switch/.test(node.type) || /Block/.test(node.type)){
        return true;
    }else{
        return false
    }
}

function dump(tree){
    return JSON.stringify(tree);
}

var visited = [];

function findoutCirs(tree){
    if(!tree)
        return;

    if(visited.includes(tree)){
        console.log(tree);
        throw tree;
    }
    visited.push(tree);
    let isArray = Array.isArray(tree);
    let shadow = isArray?[]:{};

    for(let key in tree){
        if(typeof tree[key] == 'object'){
            findoutCirs(tree[key]);
        }
    }
}

function testBuilder(){
    var pathManager = new espath.PathManager({});
    var scopeManager = new espath.ScopeManager({});

    var tree = generator.generate(undefined,{},scopeManager,pathManager);

    //tree = JSON.parse(rf.readFileSync('page.json','utf-8'));

    //console.log(tree);

    rf.writeFileSync('page.json',dump(tree));

    var page = escodegen.generate(tree);

    console.log(page);

    //rf.writeFileSync('page.js',page);
}

var counter=0;
var success=0;

//testRun(0)
//testBuilder()


console.error(child_process.execFile("./SHM_TEST_set"));


for(let i=0;i<10000;i++){
    //console.log(i);
    //testBuilder();
    if (!testRun(i)) break;
}


function currentVaribles(path){
    let currentVaribles = [];
    let scopeVisitor = path.scope;
    while(scopeVisitor){
        for(varible of scopeVisitor.variables){
            currentVaribles.push(varible);
        }
        scopeVisitor = scopeVisitor.upper;
    }
    return currentVaribles;
}

function currentFunctions(vars){
    var currentNames = [];
    for(_var of vars){
        if(_var.defs.length){
           if( _var.defs[0].type == "FunctionName")
            currentNames.push(_var.name);
        }
    }
    return currentNames;
}

function currentLiteral(vars){
    var currentNames = [];
    for(_var of vars){
        if(_var.defs.length){
           if( _var.defs[0].type == "FunctionName")
            currentNames.push(_var.name);
        }
    }
    return currentNames;
}


function testMutate(){

    var raw=rf.readFileSync("page.js","utf-8");

    var ast = esprima.parse(raw);

    var scopeManager = escope.analyze(ast,{ecmaVersion:7,directive:true});
    var pathManager = espath.analyze(ast,scopeManager,{ecmaVersion:7});

    var mutateSize = 0;

    rf.writeFileSync('page.json',dump(ast));
    estraverse.replace(ast, {
        enter: function(node, parent) {
            if (/Program/.test(node.type) || /Identifier/.test(node.type) || /Literal/.test(node.type) || /Declaration/.test(node.type) || /Block/.test(node.type)  || node.mutated) {
                return node;
            }
            let path = pathManager.acquire(node);
    
            if(random.randomBool() && mutateSize){
                //mutateSize--;
                return generator.mutate(ast,{state:{depth:5}},scopeManager,pathManager,node);
            }

            // if(/ExpressionStatement/.test(node.type) && /BinaryExpression/.test(node.expression.type) && node.expression.left.value == 0x1009){
            //     return generator.mutate(ast,{state:{depth:3}},scopeManager,pathManager,node);
            // }

        },
        leave: function(node, parent) {
            if(/BinaryExpression/.test(node.type) && node.left.value == 0x10ad){
                mutateSize = 20;
            }            
        }
    });

    // deadloop eliminate
    estraverse.replace(ast, {
        enter: function(node, parent) {
        },
        leave: function(node, parent) {
            if(/ForStatement/.test(node.type) || /WhileStatement/.test(node.type) || /DoWhileStatement/.test(node.type)){
                var loop = node;
                var _node = {"type":"BlockStatement", "body":[]};

                var guard_p = {
                    "type": "VariableDeclaration",
                    "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                        "type": "Identifier",
                        "name": "interestContol"
                        },
                        "init": {
                        "type": "Literal",
                        "value": 0,
                        "raw": "0"
                        }
                    }
                    ],
                    "kind": "var"
                }
                var guard_n = {
                    "type": "IfStatement",
                    "test": {
                    "type": "BinaryExpression",
                    "operator": "<",
                    "left": {
                        "type": "UpdateExpression",
                        "operator": "++",
                        "argument": {
                        "type": "Identifier",
                        "name": "interestContol"
                        },
                        "prefix": false
                    },
                    "right": {
                        "type": "Literal",
                        "value": 10000,
                        "raw": "1000"
                    }
                    },
                    "consequent": {
                    "type": "BreakStatement",
                    "label": null
                    },
                    "alternate": null
                }
                let _body = loop.body;
                if(/BlockStatement/.test(_body.type)){
                }else{
                    let body = {"type":"BlockStatement", "body":[]};;
                    body.body.push(_body);
                    loop.body = body;
                    
                }
                loop.body.body.push(guard_n);
                _node.body.push(guard_p);
                _node.body.push(loop);

                return _node;
            }
        }
    });

    rf.writeFileSync('page.json',dump(ast));
    var page = escodegen.generate(ast);
    // console.log(page);  
    rf.writeFileSync(tmpfile,page);
}

function testTraverse(){
    var raw=rf.readFileSync("page.js","utf-8");

    var ast = esprima.parse(raw);

    var scopeManager = escope.analyze(ast,{ecmaVersion:7});
    var pathManager = espath.analyze(ast,scopeManager,{ecmaVersion:7});


    estraverse.traverse(ast, {
        enter: function(node, parent) {
            // do stuff
            
            if(/BinaryExpression/.test(node.type) && node.left.value == 0x10ad){
                let path = pathManager.acquire(node);
                for(let v of currentVaribles(path))
                console.log(v.name)
            }
        },
        leave: function(node, parent) {
            if (/Function/.test(node.type)) {
                
            }
            
            // do stuff
        }
    });
}

function testRun(i){
    testMutate();
    console.error("started",i, 1.0*success/counter, success);
    counter++;
    try {
        console.error(child_process.execFileSync("/media/detlef/Fast/KALI/fuzzer/gecko-dev/js/src/fuzzbuild_OPT.OBJ/dist/bin/js",[tmpfile],{timeout:4000,stdio:'pipe'}));
        //console.log(child_process.execFileSync("/media/detlef/Fast/KALI/fuzzer/ASTFuzz/a.out",["r.js"],{timeout:4000}));
        success++;
    } catch (err) {
        //console.error(err);
        if (err.signal == 'SIGSEGV') {console.error(err.signal,process.pid); return 0;}
    }
    console.error("done");
//    sleep(10000);
    return 1;
}


