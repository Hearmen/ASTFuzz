escodegen = require('escodegen');
var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var espath = require('./espath/lib');
var random = require('./random');

var generator = require('./esbuilder');


var rf=require("fs");


function dump(tree){
    return JSON.stringify(tree);
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

    var mutateSize = 20;

    rf.writeFileSync('page.json',dump(ast));
    estraverse.replace(ast, {
        enter: function(node, parent) {
            // do stuff
            // if (/Program/.test(node.type) || /Identifier/.test(node.type)) {
            //     return node;
            //     //currentScope = currentScope.upper;  // set to parent scope
            // }
    
            // if(random.randomBool() && mutateSize){
            //     mutateSize--;
            //     return generator.mutate(ast,{state:{depth:3}},scopeManager,pathManager,node);
            // }
        },
        leave: function(node, parent) {
            if (/Program/.test(node.type) || /Identifier/.test(node.type)) {
                return node;
                //currentScope = currentScope.upper;  // set to parent scope
            }
    
            if(random.randomBool() && mutateSize){
                mutateSize--;
                return generator.mutate(ast,{state:{depth:3}},scopeManager,pathManager,node);
            }
            // if (/ExpressionStatement/.test(node.type)) {
            //     return generator.mutate(ast,{state:{depth:5}},scopeManager,pathManager,node);
            // }

            // if(/BinaryExpression/.test(node.type) && node.left.value == 0x10ad){
            //     return generator.mutate(ast,{state:{depth:5}},scopeManager,pathManager,node);
            // }
        }
    });

    //rf.writeFileSync('page.json',dump(ast));
    var page = escodegen.generate(ast);
    console.log(page);  
}

function testTraverse(){
    var raw=rf.readFileSync("page.js","utf-8");

    var ast = esprima.parse(raw);

}





var seed_file = process.argv[2];
var page_file = process.argv[3];

// read file from seed
var rf = require("fs");
var raw = rf.readFileSync(seed_file, "utf-8");

var preSrc = `
var var_x1 = {prop_x1:1,prop_x2:1,prop_x3:1,prop_x4:1}; //inline_head_obj
var var_x2 = [1,2,3,4,5,6,7]; // native inline_head_arr
var var_x3 = [[],[],[],[],[]];  // obj inline_head_arr
var var_x4 = [1.1,2.2,3.3,4.4,5.5];  // float inline_head_arr
var var_x5 = [1,2,3,4,5,6,7]; // missingvalue native array
delete var_x5[3] 
var var_x6 = [[],[],[],[],[]]; // missingvalue obj array
delete var_x6[3]
var var_x7 = [1.1,2.2,3.3,4.4,5.5]; // float obj array
delete var_x7[3]
var var_x8 = new Array(10).fill(0); // missingvalue native array
var_x8.length = 100;
var var_x9 = new Array(10).fill([]); // missingvalue native array
var_x9.length = 100;
var var_x10 = new Array(10).fill(1.1); // missingvalue native array
var_x10.length = 100;
var var_x11 = {}   // max pathType obj
for(let i=5;i<0x85;i++)
    var_x11['prop_x'+i] = 1;
var var_x12 = {prop_x133:1, prop_x134:2}; // min simpleDictionaryType
var_x12.prop_x135 = 1;
delete var_x12.prop_x133;
var var_x13 = [0];  // mutil seg array
var_x13[0x100] = 1;
var_x13[0x1000] = 2;
var_x13[0x10000] = 3;
var_x13[0x100000] = 3;
var __proto__ = [];
var var_x14 = {__proto__}; // 
var var_c1 = 1;
var var_c2 = 1.1;
var var_c3 = 0x7fffffff;
var var_c4 = 0xffffffff;
var var_c5 = 0x80028002;
var var_c6 = 0x0;
var var_c7 = 0x3fffffff;
var var_c8 = 0x10000000000000180;   // max length

function func_x0(){};
function func_x1(){return var_x1};
function func_x2(){return var_x2};
function func_x3(){return var_x3};
function func_x4(){return var_x4};
function func_x5(){return var_x5};
function func_x6(){return var_x6};

print = function (a) {
    return a + '' // do not print to stdout, it's slow
};

alert = print;
console = { log: print };
readbuffer = print;
printObj = print;

WScript = { 
    Echo: print, 
    LoadScriptFile: print,
    Arguments: [1,2,3,4,5,6,7,8],
    Platform:{
        BUILD_TYPE: 'release'
    },
    LoadModule: function(s){ try{eval(s)}catch(e){}},
    LoadScript: function(s){ try{eval(s)}catch(e){}},
    RegisterCrossThreadInterfacePS: print,
    RegisterModuleSource: print,
    Flag: print,
    Attach: print,
    SetTimeout: print,
    Quit: print,
    DumpFunctionPosition: print
};

testRunner = {
    runTests: function(tests){
        for(let i in tests){
            try{tests[i].body()}catch(e){}
        }
    },
    run: function(tests){
        for(let i in tests){
            try{tests[i].body()}catch(e){}
        }
    }
};

assert = {
    strictEqual: function(){},
    areEqual: function(){},
    areNotEqual: function(){},
    areAlmostEqual: function(){},
    isTrue: function(){},
    isFalse: function(){},
    isUndefined: function(){},
    isNotUndefined: function(){},
    throws: function(){},
    doesNotThrow: function(){},
    fail: function(){},
    matches: function(){}
};

helpers = {
    isInBrowser: false,
    isCompatVersion9: false,
    isVersion10OrLater: true,
    getDummyObject: function () {return {}},
    writeln: print,
    printObject: print,
    withPropertyDeleted: print,
    getTypeOf: print,    
    getFileAndLineInfo: print
};

CollectGarbage = function(){
    for(let i =0;i<1000;i++){
        var ab = new ArrayBuffer(0x1000)
    }
};

gc = CollectGarbage;

TrimStackTracePath = function(){};

0x10ad+0xbeef;
`
var preSrcAst = esprima.parse(preSrc).body;

//for (var i=0;i<10;i++)
//    testMutate();
//return;

var ast = esprima.parse(raw);

ast.body = preSrcAst.concat(ast.body);

//InitAncestor(shadow);

var scopeManager = escope.analyze(ast,{ecmaVersion:7});
var pathManager = espath.analyze(ast,scopeManager,{ecmaVersion:7});


var mutateSize = 20;

estraverse.replace(ast, {
    enter: function(node, parent) {
        if (/Program/.test(node.type) || /Identifier/.test(node.type) || /Literal/.test(node.type) || /Declaration/.test(node.type) || /Block/.test(node.type)  || node.mutated) {
                return node;
            }
            let path = pathManager.acquire(node);
    
            if(random.randomBool() && mutateSize){
                mutateSize--;
                return generator.mutate(ast,{state:{depth:3}},scopeManager,pathManager,node);
            }

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

var page = escodegen.generate(ast);
//console.log(page);

//console.log(page);

//}
rf.writeFile(page_file, page, (err)=>{if(err)console.log(err);else console.log("SUCCESS");})
