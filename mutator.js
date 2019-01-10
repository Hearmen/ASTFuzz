function Mutate(){

    var raw=rf.readFileSync("page.js","utf-8");

    var ast = esprima.parse(raw);

    var scopeManager = escope.analyze(ast,{ecmaVersion:7,directive:true});
    var pathManager = espath.analyze(ast,scopeManager,{ecmaVersion:7});

    var mutateSize = 0;

    rf.writeFileSync('page.json',dump(ast));
    estraverse.replace(ast, {
        enter: function(node, parent) {
            
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
    rf.writeFileSync('r.js',page);
}