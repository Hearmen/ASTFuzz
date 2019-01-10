

首先根据提供的种子文件生成 ast ，这个过程使用 Firefox 的 shell 文件 `Reflect.parse`进行，将 ast 以 json 的形式表现出来。

AST Node 分为以 42 种，相同语义的 Node 可以考虑进行替换

先按照 ES 的标准区分 Statement 和 Expression

Expresion

- AssignmentExpression
- BinarayExpression : Arithmetic operators, Bitwise operators,Comparison operators,  Logical operator, Operator precedence, in, instanceof
- UnaryExpression : delete,void, typeof
- SequenceExpression : Comma operator
- CondtionalExpresion ： Conditional operator
- ArrayPattern, ObjectPattern : Destructuring assignment
- ObjectExpresion : Object Init , 
- MemberExpression : Property accessor, super
- ClassExpression : class Expression
- FunctionExpression : async function ,function,function*
- AwaitExpression : await
- NewExpression : New
- MetaProperty : new.target
- CallExpression  : 
- CallSuperExpression : super
- ThisExpression : this
- YieldExpression : yield, yield*
- ConstructorExpression : constuctor

Statement

- FunctionDeclaration : async function ,function,function*
- BlockStatement : block 
- BreakStatement : break
- ClassDeclaration : class declaration 
- VaribleDeclaration : const ,let, var
- ContinueStatement : continue
- DebuggerStatement : debug
- SwitchStatement : default
- DoWhileStatement : do-while
- EmptyStatement : empty
- ForStatement : for
- ForInStatement : for-in
- ForOfStatement : for-of
- FunctionDeclaration : function declaration, function*
- IfStatement ： if-else
- LabelStatement : label
- ReturnStatement : return
- SwitchStatement : switch
- ThrowStatement : throw
- TryStatement : try-catch
- WhileStatement : while

iteration statement

- ForStatement
- ForInStatement
- DoWhileStatement
- WhileStatement
- ForOfStatement


Token 
那些专有的值

- arguments


约束

- calleeExpression ： callee 必须是一个 identifier 或者 function
- WithStatement ： with 不能出现在 class 中
- CallSuperExpression ： Super 只能出现在 Class 和 ObjectExpression 中
- 




值节点

- Literal ： 数据
      - Boolean 
      - Number
      - Null
      - String
- Regexp 暂未实现
- ArrayExpression  :  [1,2,3,4]
- ObjectExpression ： {a:'a'}

操作节点（操作符）
- BinaryExpression :  a+b
- UnaryStatement ： a++
- AssignmentExpression  :  a = 1
- LogicalExpression ： && ||

控制节点
- DoWhileStatement : do while
- ForInStatement  :  for in 
- ForStatement  :  for 
- IfStatement : if
- LabelStatement : 跳转
- SwtichStatement
- TryStatement  // remain
- ThrowStatement  // remain
- WhileStatement
- WithStement
- ExpressionStatement  : 一条表达式

- BreakStatement
- EmptyStatement 
- ContinueStatement
- DebuggerStatement

- ReturnStatement



属性节点
- MemberExpression ：  arr[] ： compute：true；   arr.a: compute:false
- CallExpression : func()



BlockStatement : {}

ConditionalExpression:  t?s:a



FunctionDeclearation  : function aa(){}

FunctionExpression : function 定义

Identifer :  变量

IdentifierName  : 变量名

NewExpression : new 

Program

RegExp



SequenceExpression 

ThisExpression

UpdateExpression  : ++ ,--

VaribleDeclaration





变量声明

```
var a = 1;

       {  
         "loc":null,
         "type":"VariableDeclaration",
         "kind":"var",
         "declarations":[  
            {  
               "loc":null,
               "type":"VariableDeclarator",
               "id":{  
                  "loc":null,
                  "type":"Identifier",
                  "name":"a"
               },
               "init":{  
                  "loc":null,
                  "type":"Literal",
                  "value":1
               }
            }
         ]
      },
```

```
var a = "1";   //"type":"Literal"

       {  
         "loc":null,
         "type":"VariableDeclaration",
         "kind":"var",
         "declarations":[  
            {  
               "loc":null,
               "type":"VariableDeclarator",
               "id":{  
                  "loc":null,
                  "type":"Identifier",
                  "name":"a"
               },
               "init":{  
                  "loc":null,
                  "type":"Literal",
                  "value": "222"
               }
            }
         ]
      },

```

```
var a = new Array(10);  // "type":"NewExpression",

      {  
         "loc":null,
         "type":"VariableDeclaration",
         "kind":"var",
         "declarations":[  
            {  
               "loc":null,
               "type":"VariableDeclarator",
               "id":{  
                  "loc":null,
                  "type":"Identifier",
                  "name":"a"
               },
               "init":{  
                  "loc":null,
                  "type":"NewExpression",
                  "callee":{  
                     "loc":null,
                     "type":"Identifier",
                     "name":"Array"
                  },
                  "arguments":[  
                     {  
                        "loc":null,
                        "type":"Literal",
                        "value":10
                     }
                  ]
               }
            }
         ]
      }

```
```
var a = [1,2,3,4]   // "type":"ArrayExpression"

{  
         "loc":null,
         "type":"VariableDeclaration",
         "kind":"var",
         "declarations":[  
            {  
               "loc":null,
               "type":"VariableDeclarator",
               "id":{  
                  "loc":null,
                  "type":"Identifier",
                  "name":"a"
               },
               "init":{  
                  "loc":null,
                  "type":"ArrayExpression",
                  "elements":[  
                     {  
                        "loc":null,
                        "type":"Literal",
                        "value":1
                     },
                     {  
                        "loc":null,
                        "type":"Literal",
                        "value":2
                     },
                     {  
                        "loc":null,
                        "type":"Literal",
                        "value":3
                     },
                     {  
                        "loc":null,
                        "type":"Literal",
                        "value":4
                     }
                  ]
               }
            }
         ]
      }
```

控制语句

```

```


接着根据 AST 进行变异，主要的变异策略分为三类：

- 简单变异，这种变异方式不涉及 Node 结构的变化，仅仅对数据和符号进行变异
    - 数据替换：简单数据替换，字符串、数字
    - 符号替换：二元数字操作符替换&二元逻辑操作符替换&比较操作符替换%一元操作符替换%一元操作符删除&
- 表达式变异，对 Node 本身进行变换
- AST Node 变异，相同功能的 node 可以进行替换
    - 循环替换&循环删除&循环添加
    - 条件控制语句替换

变异出的语句不能过于复杂，因此需要进行一定程度的控制，保证变异出的代码都是合法代码


语句变异的第一步需要确定每个 scope 中可用的变量






JSON 中不识别的属性名， escodegen 会直接忽略，根据这种特性，可以在 astnode 中使用标记属性控制 变异情况

最后将 AST 返回成 js 文件，这个步骤使用 Firefox 提供的 nodejs 组件 escodegen

最后有一个问题是，FireFox 的 Parse 不能很好的解析 class 和 codegen 不很匹配，所以遇到 class 的情况需要自己改一下~

Spread 的解析也有区别，firefox 会解析成 SpreadExpression ，codegen 使用的是 SpreadElement


附录上记录所有 ast-properties

```javascript
module.exports = {
  ArrayExpression: ['type', 'elements'],
  ArrayPattern: ['type', 'elements'],   ?????
  ArrowFunctionExpression: ['type', 'id', 'params', 'body', 'generator', 'expression', 'async'],
  AssignmentExpression: ['type', 'operator', 'left', 'right'],
  AssignmentPattern: ['type', 'left', 'right'],
  AwaitExpression: ['type', 'argument'],
  BinaryExpression: ['type', 'operator', 'left', 'right'],
  BlockStatement: ['type', 'body'],
  BreakStatement: ['type', 'label'],
  CallExpression: ['type', 'callee', 'arguments'],
  CatchClause: ['type', 'param', 'guard', 'body'],
  ClassBody: ['type', 'body'],
  ClassDeclaration: ['type', 'id', 'superClass', 'body'],
  ClassExpression: ['type', 'id', 'superClass', 'body'],
  ConditionalExpression: ['type', 'test', 'consequent', 'alternate'],
  ContinueStatement: ['type', 'label'],
  DebuggerStatement: ['type'],
  DoWhileStatement: ['type', 'body', 'test'],
  EmptyStatement: ['type'],
  ExportAllDeclaration: ['type', 'source'],
  ExportDefaultDeclaration: ['type', 'declaration'],
  ExportNamedDeclaration: ['type', 'declaration', 'specifiers', 'source'],
  ExportSpecifier: ['type', 'exported', 'local'],
  ExpressionStatement: ['type', 'expression'],
  ForInStatement: ['type', 'left', 'right', 'body'],
  ForOfStatement: ['type', 'left', 'right', 'body', 'await'],
  ForStatement: ['type', 'init', 'test', 'update', 'body'],
  FunctionDeclaration: ['type', 'id', 'params', 'body', 'generator', 'async'],
  FunctionExpression: ['type', 'id', 'params', 'body', 'generator', 'async'],
  Identifier: ['type', 'name'],
  IfStatement: ['type', 'test', 'consequent', 'alternate'],
  ImportDeclaration: ['type', 'specifiers', 'source'],
  ImportDefaultSpecifier: ['type', 'local'],
  ImportNamespaceSpecifier: ['type', 'local'],
  ImportSpecifier: ['type', 'imported', 'local'],
  LabeledStatement: ['type', 'label', 'body'],
  Literal: ['type', 'value', 'regex'],
  LogicalExpression: ['type', 'operator', 'left', 'right'],
  MemberExpression: ['type', 'object', 'property', 'computed'],
  MetaProperty: ['type', 'meta', 'property'],
  MethodDefinition: ['type', 'key', 'value', 'kind', 'computed', 'static'],
  NewExpression: ['type', 'callee', 'arguments'],
  ObjectExpression: ['type', 'properties'],
  ObjectPattern: ['type', 'properties'],
  Program: ['type', 'body', 'sourceType'],
  Property: ['type', 'key', 'value', 'kind', 'method', 'shorthand', 'computed'],
  RestElement: ['type', 'argument'],
  ReturnStatement: ['type', 'argument'],
  SequenceExpression: ['type', 'expressions'],
  SpreadElement: ['type', 'argument'],
  Super: ['type'],
  SwitchCase: ['type', 'test', 'consequent'],
  SwitchStatement: ['type', 'discriminant', 'cases', 'lexical'],
  TaggedTemplateExpression: ['type', 'tag', 'quasi'],
  TemplateElement: ['type', 'tail', 'value'],
  TemplateLiteral: ['type', 'quasis', 'expressions'],
  ThisExpression: ['type'],
  ThrowStatement: ['type', 'argument'],
  TryStatement: ['type', 'block', 'handler', 'finalizer'],
  UnaryExpression: ['type', 'operator', 'prefix', 'argument'],
  UpdateExpression: ['type', 'operator', 'argument', 'prefix'],
  VariableDeclaration: ['type', 'declarations', 'kind'],
  VariableDeclarator: ['type', 'id', 'init'],
  WhileStatement: ['type', 'test', 'body'],
  WithStatement: ['type', 'object', 'body'],
  YieldExpression: ['type', 'argument', 'delegate']
};
```