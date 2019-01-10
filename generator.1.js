var escodegen = require('escodegen');
var random = require('./random');
var estraverse = require('./estraverse/estraverse');

var SimpleMutator = require('./Mutate/SimpleMutate.js').simpleMutator;
var ExtendMutator = require('./Mutate/ExtendMutate.js').extendMutator;
var Traverse = require("./Traverse.js").traverse;

var Copy = require("./utils").copy;
var Dump = require("./utils").dump;
var InvalidMutate = require("./utils").invalidMutate;
var StatementMutate = require("./Mutate/StatementMutate.js")
var ExpressionMutate = require("./Mutate/ExpressionMutate.js")

var Program = require('./nodes/Program');

cache$ = require('./combinators');
oneOf = cache$.oneOf;
maybe = cache$.maybe;


let statements = [
	//"BlockStatement",  // block is not allowed be mutated, because in some cases block in an necessary statement
	"BreakStatement",
	"ContinueStatement",
	"DebuggerStatement",
	"DoWhileStatement",
	"EmptyStatement",
	"ExpressionStatement",
	"ForInStatement",
	"ForStatement",
	//"FunctionDeclaration",
	"IfStatement",
	"LabeledStatement",
	"ReturnStatement",
	"SwitchStatement",
	"ThrowStatement",
	"TryStatement",
	//"VariableDeclaration",
	"WhileStatement",
	"WithStatement",
	"ClassDeclaration"
]

/*
	Statement could mutate to another Statement
*/
function StatementNodeMutate(node, mutator, control_param) {
	if (node == null)
		return;
	let isArray = Array.isArray(node);
	let shadow = isArray ? [] : {};

	if (control_param["mutateValue"] <= 0)
		return Copy(node);

	if (node["mutable"] == false)
		return Copy(node);

	for (var key in node) {
		//console.log(key + '  ' + node[key]);
		if (key == "loc" || key == "insert" || key == "mutable")
			continue;
		if ((typeof node[key] == "object")) {
			let value = StatementNodeMutate(node[key], mutator, control_param);
			if (value) shadow[key] = value;
		} else {
			//console.log(key + ' ' + node[key]);
			shadow[key] = node[key];
		}
	}

	if (["DoWhileStatement", "ForInStatement", "ForStatement", "IfStatement", "SwitchStatement", "WhileStatement", "WithStement", "ContinueStatement", "BreakStatement", "EmptyStatement", "ExpressionStatement", "FunctionDeclaration", "VariableDeclaration"].indexOf(node['type']) > -1) {
		if (random.randomBool()) {
			control_param["mutateValue"]--;
			return mutator(node);
		}
	}

	return shadow;
}

/*
        Do the Simple mutate, only mutate value and operator in place
		control_param used to control the mutate rant, the account of mutable value
		
		In-place change
    */
function SimpleNodeMutate(node, control_param) {
	if (node == null)
		return;

	var shadow = Copy(node);

	//let isArray = Array.isArray(node);
	//let shadow = isArray ? [] : {};

	do{
		if (node["mutable"] == false)
			break;
		if (control_param["mutateValue"] <= 0)
			break;

		// mutate the operator and value
		if (["UpdateExpression", "LogicalExpression", "BinaryExpression", "UnaryExpression", "Literal", "AssignmentExpression"].indexOf(node['type']) > -1) {
			if (random.randomBool(0.3)) {
				control_param["mutateValue"]--;
				shadow = SimpleMutator(node);
				break;
			}
		}

		
		// extend the simple statement
		if (statements.indexOf(node['type']) > -1) {
			if (random.randomBool(0.3)) {
				control_param["mutateValue"]--;
				shadow = ExtendMutator(node);
				break;
			} 
		}
		

		for (var key in node) {
			if (key == "loc" || key == "insert")
				continue;
			//console.log(key + '  ' + node[key]);
			if ((typeof node[key] == "object")){
				let value = SimpleNodeMutate(node[key], control_param);
				if (value) shadow[key] = value;
			}
		}
	}
	while (false);

	return shadow;
}



/*
	CallExpression
	MemberExpression
*/
function ExpressionNodeMutate(node, mutator, control_param) {
	if (node == null)
		return;

	let isArray = Array.isArray(node);
	let shadow = isArray ? [] : {};

	if (control_param["mutateValue"] <= 0)
		return;

	if (["ArrayExpression", "CallExpression", "ConditionalExpression", "FunctionExpression", "Identifier", "LogicalExpression", "MemberExpression", "NewExpression", "ObjectExpression", "SequenceExpression", "ThisExpression", "UpdateExpression", "BinaryExpression", "UnaryExpression", "AssignmentExpression"].indexOf(node['type']) > -1) {
		if (random.randomBool()) {
			control_param["mutateValue"]--;
			return mutator(node);
		} else {
			return Copy(node);
		}
	}

	for (var key in node) {
		if (key == "loc" || key == "insert")
			continue;
		//console.log(key + '  ' + node[key]);
		if ((typeof node[key] == "object")) {
			let value = ExpressionNodeMutate(node[key], mutator, control_param)
			if (value) shadow[key] = value;
		} else {
			shadow[key] = node[key];
		}
	}
	return shadow;
}

/*
	Mutation fuzz 

	AST  -> Shadow -> mutated AST -> js code 

						     mutated AST
		 			/              |               \
	1.statement mutate   2. expression mutate   3. value mutate
	
	1. Traverse the AST to mark node that should be mutated, and record the object of each scope
	the information stored in another tree named shadow
	
	2. Traverse the Shadow ,mutate the marked node to 
	
	
*/

/*
	PathManager
*/

// read file from seed
var rf = require("fs");

var page_file = 'page.js';

var ast = Program(10,null);

var page = escodegen.generate(ast);

//console.log(page);

//}
rf.writeFileSync(page_file, page)
