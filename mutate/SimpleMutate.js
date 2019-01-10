void function () {
    var random = require('../random');
    var Copy = require("../utils").copy

    let binary_operator = ['+','-','*','/','%','**','&','|','^','<<','>>','>>>']; // Math operator
    let binary_condition = ['==','!=','<','<=','>','>=','===','!==','instanceof','in']; // condition operator
    let assign_operator = ['+=','-=','*=','**=','/=','%=','&=','^=','|=','<<=','>>=','>>>=','='];
    let boolean_value = ['false','true'];
    let unary_operator = ['~','-','!','++','--','+','']; // '...' 'typeof'
    let update_operator = ['++','--'];
    let logical_operator = ['&&','||'];

    exports.simpleMutator = SimpleMutator;

    /*
    Simple mutator,change the operator and value,include value_mutator and operator mutator
    */
    function SimpleMutator(node, control_param){
        var shadow = node;
        switch (node['type']){
            case 'BinaryExpression':
                shadow = BinaryOperatorReplacement(node);
                break;
            case 'LogicalExpression':
                shadow = LogicalReplacement(node);
                break;
            case 'UpdateExpression':
                shadow = UpdateOperatorReplacement(node);
                break;
            case 'UnaryExpression':
                shadow = UnaryOperatorReplacement(node);
                break;
            case 'Literal':
                shadow = LiteralReplacement(node);
                break;
            case 'AssignmentExpression':
                shadow = AssignmentReplacement(node);
                break;
        }

        return shadow;
    }

    function LogicalReplacement(node){
        var shadow = Copy(node);
        do{
            if (node["type"] != 'LogicalExpression')
                break; 

            if (node["operator"] == null)
                break;

            if (node["mutate"] == false)
                break;
            
            operator = node["operator"];
            if (logical_operator.includes(operator)){
                shadow["operator"] = random.randomElement(logical_operator);
            }
        }while(false)
        return shadow;
    }

    function AssignmentReplacement(node){
        var shadow = Copy(node);

        do{
            if (node["type"] != 'AssignmentExpression')
                break; 

            if (node["operator"] == null)
                break;

            if (node["mutate"] == false)
                break;

            
            operator = node["operator"];
            if (assign_operator.includes(operator)){
                shadow["operator"] = random.randomElement(assign_operator);
            }
        }while(false)
        return shadow;
    }

    /*
        Replace binary operator 
    */
    function BinaryOperatorReplacement(node){
        
        var shadow = Copy(node);
        
        do{
            if (node["type"] != 'BinaryExpression')
                break; 

            if (node["operator"] == null)
                break;

            if (node["mutate"]== false)
                break;
            
            operator = node["operator"];
            if (binary_operator.includes(operator)){
                shadow["operator"] = random.randomElement(binary_operator);
            }
            else if (binary_condition.includes(operator)){
                shadow["operator"] = random.randomElement(binary_condition);
            }
        }while(false)
        return shadow;
    }

    /*
        Replace unary operator 
    */
    function UnaryOperatorReplacement(node){
        var shadow = Copy(node);

        do{
            if (node["type"] != "UnaryExpression")
                break;

            if (node["operator"] == null)
                break;

            if (node["mutatable"]== false)
                break;
            
            operator = node["operator"];
            //console.log("UnaryOperatorReplacement");
            if (unary_operator.includes(operator)){
                shadow["operator"] = random.randomElement(unary_operator);
            }
        }while(false)
        return shadow;
    }

    /*
        Replace update operator 
    */
   function UpdateOperatorReplacement(node){
        var shadow = Copy(node);

        do{
            if (node["type"] != "UpdateExpression")
                break;

            if (node["operator"] == null)
                break;

            if (node["mutatable"]== false)
                break;
            
            operator = node["operator"];
            //console.log("UnaryOperatorReplacement");
            if (unary_operator.includes(operator)){
                shadow["operator"] = random.randomElement(update_operator);
            }
        }while(false)
        return shadow;
    }

    /*
        replace the value to random value in same type
        Literal Value include : number ,string, boolean, null
        // TODO: null value
    */
    function LiteralReplacement(node){
        var shadow = Copy(node);

        do{
            if (node["type"] != "Literal")
                break;

            if (node["mutatable"]== false)
                break;

            //console.log("LiteralReplacement");
            if (typeof node['value'] == typeof 1)
                shadow['value'] = random.randomInt(0xffffffff);
            else if (typeof node['value'] == typeof true)
                shadow['value'] = random.randomBool();
            else if (typeof node['value'] == typeof '1')
                shadow['value'] = random.randomString();
        }while(false)
        return shadow;
    }

    
}.call(this);