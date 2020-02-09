
var Scope = require('./scope');
var Path = require('./path').path;
var ValueInfo = require('./path').valueinfo;
var ValueType = require('./path').valuetype;
var ValueMap = require('./path').valuemap;

class PathManager{
    constructor(options){
        this.__nodeToPath = new WeakMap();
        this.__currentAncestor = null;  // pred node in mutate exe
        this.__currentParent = null;   // parent node 
        this.__currentPath = null;
        this.__options = options;
        this.__currentValueMap = new ValueMap();  // do as the valueMap in chakra
        this.__valueTable = new Map();
        this.__initialize();
    }

    __initialize(){

        /**
         * init null
         */
        var nullTypeInfo = new ValueInfo(0x0001);
        this.__valueTable.set("null",nullTypeInfo);

        /**
         * init number type
         */
        var numberTypeInfo = new ValueInfo(0x0002);
        this.__valueTable.set("numberType",numberTypeInfo);

        /**
         * init number type
         */
        var booleanTypeInfo = new ValueInfo(0x0008);
        this.__valueTable.set("booleanType",booleanTypeInfo);

        /**
         * init string
         */
        var stringPrototypeTypeInfo = new ValueInfo(0x0004);
        stringPrototypeTypeInfo.__props.set("__proto__",new ValueType(0x0001));
        this.__valueTable.set("stringType",stringPrototypeTypeInfo);

        /**
         * init string prototype
         */
        var stringTypeInfo = new ValueInfo(0x0004);
        stringTypeInfo.__props.set("__proto__",new ValueType(0x0010,["stringPrototype"]));
        stringTypeInfo.__props.set("length",new ValueType(0x0002));
        this.__valueTable.set("stringType",stringTypeInfo);

        /**
         * init objectProto
         */
        var objectPrototypeTypeInfo = new ValueInfo(0x0010);
        objectPrototypeTypeInfo.__props.set("__proto__",new ValueType(0x0001));
        this.__valueTable.set("objectPrototype",objectPrototypeTypeInfo);

        /**
         * init Object prototype
         */
        var objectTypeInfo = new ValueInfo(0x0010);
        objectTypeInfo.__props.set("__proto__",new ValueType(0x0010,["objectPrototype"]));

        var functionObjectToString = new ValueInfo(0x0010);
        functionObjectToString.__props.set("__proto__",new ValueType(0x0020,["funcType"]));
        functionObjectToString.__desc = {length:0, proto:new ValueType(), ret:new ValueType(0x0004)};
        this.__valueTable.set("functionObjectToString",functionObjectToString);
        objectTypeInfo.__props.set("toString",new ValueType(0x0020,["functionObjectToString"]));

        var functionObjectValueOf = new ValueInfo(0x0010);
        functionObjectValueOf.__props.set("__proto__",new ValueType(0x0020,["funcType"]));
        functionObjectValueOf.__desc = {length:0, proto:new ValueType(), ret:new ValueType(0x0010)};
        this.__valueTable.set("functionObjectValueOf",functionObjectValueOf);
        objectTypeInfo.__props.set("valueOf",new ValueType(0x0020,["functionObjectValueOf"]));

        this.__valueTable.set("objectType",objectTypeInfo);

        /**
         * init arrayProto
         */
        var arrayPrototypeTypeInfo = new ValueInfo(0x0010);
        arrayPrototypeTypeInfo.__props.set("__proto__",new ValueType(0x0010,["objectPrototype"]));
        this.__valueTable.set("arrayPrototype",arrayPrototypeTypeInfo);

        /**
         * init Array prototype
         */
        var arrayTypeInfo = new ValueInfo(0x0010);
        arrayTypeInfo.__props.set("__proto__",new ValueType(0x0010,["arrayPrototype"]));
        arrayTypeInfo.__props.set("length",new ValueType(0x0002));
        //arrayTypeInfo.__props.set("length",new ValueType(0x0002));
        this.__valueTable.set("arrayType",arrayTypeInfo);

        /**
         * Init Function prototype
         */
        var funcTypeInfo = new ValueInfo(0x0020);
        funcTypeInfo.__props.set("__proto__",new ValueType(0x0010,["objectPrototype"]));
        funcTypeInfo.__props.set("length",new ValueType(0x0002));
        funcTypeInfo.__props.set("name",new ValueType(0x0004));
        this.__valueTable.set("funcType",funcTypeInfo);

        /**
         * Init Class prototype
         */
        var classTypeInfo = new ValueInfo(0x0040);
        classTypeInfo.__props.set("__proto__",new ValueType(0x0010,["objectPrototype"]));
        this.__valueTable.set("classType",classTypeInfo);

        /**
         * Init AnyType
         * when it can not analysis, the value will be this
         * any prop can be any identifier appeared
         */
        var anyTypeInfo = new ValueInfo(0x00ff);
        anyTypeInfo.__desc = {length:0, proto:new ValueType(0x00ff,["anyType"]), ret:new ValueType(0x00ff, ["anyType"])};;
        this.__valueTable.set("anyType",anyTypeInfo);
    }

    __get(node) {
        return this.__nodeToPath.get(node);
    }

    acquire(node, inner) {
        var path, i, iz;

        path = this.__get(node);

        return path;
    }

    __currEnviroment(){
        var scopeWalker;
        scopeWalker = this.scope;
        while(scopeWalker){
            if(/function/.test(scopeWalker.type)){
                return scopeWalker.block
            }
            scopeWalker = scopeWalker.upper;
        }
        return null;
    }

    __updateValueMap(node, path){  
        var objPath;
        objPath = this.acquire(node.object);
        for(let prop of this.__valueTable.get(objPath._valueType.__symIndex).__props){
            path.valueMap.set(prop[0],prop[1]);
        }
    }

    /*
      一步
      TODO : currentAncestor is not the real ancestor
    */
    __stepPath(path){
        // setup the path info
        let node = path.node;
        let predPath = this.acquire(path.predcessor);
        if(predPath){  // 
            predPath.successor = node;
            this.__currentValueMap = new ValueMap(predPath.valueMap);
            path.valueMap = new ValueMap(predPath.valueMap);
        }
        // if(this.__currentValueMap)
        //     path.valueMap = new ValueMap(this.__currentValueMap);
        this.__nodeToPath.set(node, path);
        this.__currentAncestor = this.__currentPath;
        this.__currentPath = path;
        // this.__currentValueMap = path.valueMap; // 
        return path;
    }

    __stepExpression(node, scope, parent, pred){
        this.__stepPath(new Path(this, node, parent, pred, scope));
    }

    __stepStatement(node, scope, parent, pred){
        this.__stepPath(new Path(this, node, parent, pred, scope));
    }

    // MemberExpression
    // WithStatement
    __stepFurtherExpression(node){
        var path;
        path = this.acquire(node);
        for(let availableType of path._valueType.__symIndex){
            for(let [k,v] of this.__valueTable.get(availableType).__props){ // for(let [k,v] of this.__valueTable.get(availableType)){ 
                path.valueMap.set(k,v);
            }
        }
    }
    /**
     * 进入 ObjectExpresssion 时，还需要额外更新当前的 valueMap
     */
    __stepObjectExpression(node, scope, parent, pred){
        
        this.__stepPath(new Path(this, node, parent, pred, scope));
        //this.__currentValueMap = this.__currentPath.valueMap//new Map();
    }

    __stepFunctionDeclaration(node, scope, parent, pred){
        this.__stepPath(new Path(this, node, parent, pred, scope));

    }

    __stepMemberExpression(node, scope, parent, pred){
        
        this.__stepPath(new Path(this, node, parent, pred, scope));
        //this.__currentValueMap = this.__currentPath.valueMap//new Map();
    }

    /**
     * When step out ,should merge the valueMap of child and store it into this path
     * 
     * Maybe we can ensure at this time valueMap have not been initial
     */
    __stepOutStatement(node,callback){
        let path,predPath;
        path = this.acquire(node);
        if(path){
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
            path.setPathValue(new ValueType());
        }
    }

    __stepOutExpression(node,callback){
        let path,predPath;
        path = this.acquire(node);
        if(path){
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
            path.setPathValue(new ValueType());
        }
    }

    __stepOutVariableDeclarator(node,callback){
        let path,initPath;
        path = this.acquire(node);
        initPath = this.acquire(node.init);
        if(path){
            if(/Identifier/.test(node.id.type)){
                if(initPath){
                    //path.setValue(node.id.name, initPath._valueType);  // insert into valueMap
                    this.__currentValueMap.set(node.id.name, initPath._valueType);
                    path.setPathValue(initPath._valueType);
                }
                else{
                    this.__currentValueMap.set(node.id.name, new ValueType());
                    path.setPathValue(new ValueType()); // undefine;
                }
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
        } 
    }

    __stepOutVariableDeclaration(node, callback){
        let path,predPath;
        path = this.acquire(node);
        if(path){
            // VariableDeclaration have at least one declarator , the value of VariableDeclaration is the first declarator
        
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
            path.setPathValue( this.acquire(node.declarations[0])._valueType);
        }
        
    }

    __stepOutFunctionDeclaration(node,callback){
        let path,valueinfo,valuetype,objValueinfo,retValue;
        path = this.acquire(node);
        if(path){
            for(let param of node.params){
                if(/Identifier/.test(param.type))
                    this.__currentValueMap.delete(param.name);
            }
            if(/Identifier/.test(node.id.type)){
                objValueinfo = new ValueInfo(0x0010);   // in case : new func_1(); 
                this.__valueTable.set("objType"+this.__valueTable.size,objValueinfo);

                valueinfo = new ValueInfo(0x0020);
                //retValue = this.acquire(node.body)._valueType;
                valueinfo.__desc = {length:node.params.length, proto:new ValueType(0x0020,["objType"+(this.__valueTable.size-1)]), ret:new ValueType(0x00ff, ["anyType"])};  // return value can be any type
                this.__valueTable.set("functionType"+this.__valueTable.size,valueinfo);  // insert new type into valueTable

                valuetype = new ValueType(0x0020,["functionType"+(this.__valueTable.size-1)]); 
                //path.setValue(node.id.name, valuetype);     // insert new type into valueMap
                this.__currentValueMap.set(node.id.name, valuetype);
                //path.setPathValue(valuetype);               // set valueType into currentPath ,statement do not need 
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
        }
    }

    __stepOutFunctionExpression(node,callback){
        let path,valueinfo,valuetype,objValueinfo;
        path = this.acquire(node);
        if(path){
            for(let param of node.params){
                if(/Identifier/.test(param.type))
                    this.__currentValueMap.delete(param.name);
            }

            objValueinfo = new ValueInfo(0x0010);   // in case : new func_1(); 
            this.__valueTable.set("objType"+this.__valueTable.size,objValueinfo);

            valueinfo = new ValueInfo(0x0020);
            valueinfo.__desc = {length:node.params.length, proto:new ValueType(0x0020,["objType"+(this.__valueTable.size-1)]), ret:new ValueType(0x00ff,["anyType"])};  // return value can be any type
            this.__valueTable.set("functionType"+this.__valueTable.size,valueinfo);  // insert new type into valueTable

            valuetype = new ValueType(0x0020,["functionType"+(this.__valueTable.size-1)]); 
            //path.setValue(node.id.name, valuetype);     // insert new type into valueMap
            path.setPathValue(valuetype);               // set valueType into currentPath
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
        }
    }

    __stepOutClassDeclaration(node, callback){
        let path,classType, valuetype, bodyPath;
        path = this.acquire(node);
        bodyPath = this.acquire(node.body);
        if(path){
            bodyPath = this.acquire(node.body);
            if(path && bodyPath){
                if(node.id && /Identifier/.test(node.id.type)){
                    this.__currentValueMap.set(node.id.name, bodyPath._valueType);
                }
                path.setPathValue(valuetype);
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
        }
    }

    __stepOutClassExpression(node, callback){
        let path,classType, valuetype,bodyPath;
        path = this.acquire(node);
        bodyPath = this.acquire(node.body);
        if(path && bodyPath){
            if(node.id && /Identifier/.test(node.id.type)){
                this.__currentValueMap.set(node.id.name, bodyPath._valueType);
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
            path.setPathValue(valuetype);
            callback(path);            
        }
    }

    __stepOutClassBody(node, callback){
        let path,classType, valuetype,objValueinfo;
        path = this.acquire(node);
        if(path){
            objValueinfo = new ValueInfo(0x0010);   // in case : new func_1(); 
            this.__valueTable.set("objType"+this.__valueTable.size,objValueinfo);

            classType = new ValueInfo(0x0040);
            for(let method of node.body){
                console.log(method);
                if(method.key && /Identifier/.test(method.key.type)){
                    classType.__props.set(method.key.name, this.acquire(method)._valueType);//this.__currentValueMap.get(property.key.name));
                }
            }
            classType.__desc = {length:-1, proto:new ValueType(0x0020,["objType"+(this.__valueTable.size-1)]), ret:new ValueType(0x0000)}; 

            this.__valueTable.set("classType"+this.__valueTable.size, classType);  // insert new type into valueTable
            valuetype = new ValueType(0x0040,["classType"+(this.__valueTable.size-1)]);

            for(let method of node.body){
                if(method.key && /Identifier/.test(method.key.type)){
                    this.__currentValueMap.delete(method.key.name);
                }
            }

            path.valueMap = new ValueMap(this.__currentValueMap);
            path.setPathValue(valuetype);
            callback(path);
        }
    }

    __stepOutMethodDefinition(node, callback){
        let path,valuePath;
        path = this.acquire(node);
        valuePath = this.acquire(node.value);
        if(path){
            if(/Identifier/.test(node.key.type)){
                this.__currentValueMap.set(node.key.name,valuePath._valueType);
                //path._valueType.update(valuePath._valueType);
                path._valueType = valuePath._valueType;
            }else{
                //path._valueType.update(valuePath._valueType);  
                path._valueType = valuePath._valueType;
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback();
        }
    }

    __stepOutProperty(node, callback){
        let path,valuePath;
        path = this.acquire(node);
        valuePath = this.acquire(node.value);
        if(/Identifier/.test(node.key.type)){    
            this.__currentValueMap.set(node.key.name,valuePath._valueType);
            //path._valueType.update(valuePath._valueType);
            path._valueType = valuePath._valueType;
        }else{
            //path._valueType.update(valuePath._valueType);
            path._valueType = valuePath._valueType;
        }
        path.valueMap = new ValueMap(this.__currentValueMap);
    }

    __stepOutObjectExpression(node, callback){
        let path,predPath,anyValueInfo;
        path = this.acquire(node); 
        let objType = new ValueInfo(0x0010); // create new type
        for(let property of node.properties){
            if(/Identifier/.test(property.key.type)){
                let propType = this.acquire(property)._valueType;
                objType.__props.set(property.key.name, propType);//this.__currentValueMap.get(property.key.name));
                this.__currentValueMap.delete(property.key.name);
                anyValueInfo = this.__valueTable.get("anyType");
                anyValueInfo.updateProp(property.key.name, propType);
            }
        }
        this.__valueTable.set("objectType"+this.__valueTable.size,objType); 
        path.setPathValue(new ValueType(0x0010,["objectType"+(this.__valueTable.size-1)]));
        path.valueMap = new ValueMap(this.__currentValueMap);
    }

    __stepOutArrayExpression(node, callback){
        let path;
        path = this.acquire(node); 
        if(path){
            let objType = new ValueInfo(0x0010); // create new type,
            objType.__props.set("__proto__",new ValueType(0x0020,["arrayType"]));
            //objType.__props.set('length',node.elements.length);
            //for(let item in node.elements){
            //    objType.__props.set(item, this.acquire(node.elements[item])._valueType);//this.__currentValueMap.get(property.key.name));
            //}
            this.__valueTable.set("arrayType"+this.__valueTable.size,objType); 
            path.setPathValue(new ValueType(0x0010,["arrayType"+(this.__valueTable.size-1)]));
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
        }
        
    }

    // TODO : should we analysis this value
    __stepOutCallExpression(node, callback){
        let path,calleePath;
        path = this.acquire(node); 
        calleePath = this.acquire(node.callee);
        if(path){
            if(calleePath._valueType.getType() & 0x20){
                console.log(calleePath._valueType);
                path.setPathValue(this.__valueTable.get(calleePath._valueType.getSymIndex(0x20)).__desc.ret);
            }else{
                //throw "Wrong type!";
    
                path.setPathValue(new ValueType(0x00ff,["anyType"]));
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
        }
        //let objType = new ValueInfo(0x0010); // create new type, assume the result of calle is an object

        //this.__valueTable.set("objectType"+this.__valueTable.size,objType); 
        
    }

    // TODO : should we analysis this value
    __stepOutNewExpression(node, callback){
        let path, calleePath;
        path = this.acquire(node); 
        calleePath = this.acquire(node.callee);
        if(path){
            if(calleePath._valueType.__type & 0x60){
                path.setPathValue(this.__valueTable.get(calleePath._valueType.getSymIndex(0x60)).__desc.proto);
            }else{
                //throw "Wrong type!";  builtin function
                path.setPathValue(new ValueType(0x00ff,["anyType"]));
            }
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
        }
        //let objType = new ValueInfo(0x0010); // create new type, assume the result of calle is an object

        //this.__valueTable.set("objectType"+this.__valueTable.size,objType); 
        
    }

    __stepOutBinaryExpression(node ,callback){
        let path,leftPath,rightPath;
        path = this.acquire(node); 
        leftPath = this.acquire(node.left);
        rightPath = this.acquire(node.right);

        path.valueMap = new ValueMap(this.__currentValueMap);
        //console.log(leftPath);
        path.setPathValue(new ValueType());
        path.update(leftPath, true);
        path.update(rightPath, true);
    }

    __stepOutAssignmentExpression(node, callback){
        let path,valueType, valueInfo;
        path = this.acquire(node);
        valueType = new ValueType();

        let right_path = this.acquire(node.right);
        let left_path = this.acquire(node.left);
        
        switch(node.left.type){
            case "Identifier":
                //path.setValue(node.left.name,right_path.getType());
                this.__currentValueMap.set(node.left.name,right_path.getType());
                //path.setPathValue(right_path.getType());
                break;
            case "MemberExpression":
                let objPath = this.acquire(node.left.object);
                let propPath = this.acquire(node.left.property);
                if(objPath._valueType.__type >= 0x0010){  // make sure obj is not a literal
                    valueInfo = this.__valueTable.get(objPath._valueType.getSymIndex(0x70));
                    if(/Identifier/.test(propPath.node.type)){
                        valueInfo.updateProp(propPath.node.name,right_path.getType());
                    }
                    else if(/Literal/.test(propPath.node.type)){
                        // if(valueInfo.__props.has(propPath.node.value)){
                        //     valueInfo.__props.get(propPath.node.value).update(right_path._valueType);
                        // }else{
                        //     //let newValueInfo = valueInfo.deepCopy();
                        //     //newValueInfo.__props.set(propPath.node.value,right_path._valueType);
                        //     //this.__valueTable.set("objectType"+this.__valueTable.size, newValueInfo);
                        //     valueInfo.__props.set(propPath.node.value,right_path._valueType);
                        // }
                        valueInfo.updateProp(propPath.node.name,right_path.getType());
                    }
                }
                break;
            default:   // ArrayPattern, ObjectPattern
                //throw 'Type error';
                break;
        }

        console.log(this.__currentValueMap);
        path.valueMap = new ValueMap(this.__currentValueMap);
        path.update(right_path);
        path.update(left_path);
        path.setPathValue(right_path._valueType);
    }

    __stepOutAssignmentPattern(node, callback){
        let path,valueType, valueInfo;
        path = this.acquire(node);
        valueType = new ValueType();

        let right_path = this.acquire(node.right);
        let left_path = this.acquire(node.left);
        
        switch(node.left.type){
            case "Identifier":
                //path.setValue(node.left.name,right_path._valueType);
                this.__currentValueMap.set(node.left.name,right_path.getType());
                path.setPathValue(right_path._valueType);
                break;
            // case "MemberExpression":
            //     let objPath = this.acquire(node.left.object);
            //     let propPath = this.acquire(node.left.property);
            //     if(objPath._valueType.__type >= 0x0010){  // make sure obj is not a literal
            //         valueInfo = this.__valueTable.get(objPath._valueType.__symIndex);
            //         if(/Identifier/.test(propPath.node.type)){
            //             if(valueInfo.__props.has(propPath.node.name)){
            //                 valueInfo.__props.get(propPath.node.name).update(right_path._valueType);
            //             }else{
            //                 valueInfo.__props.set(propPath.node.name,right_path._valueType);
            //             }
            //         }
            //         else if(/Literal/.test(propPath.node.type)){
            //             valueInfo.__props.set(propPath.node.value,right_path._valueType);
            //         }

            //     }
            //     break;
            default:
                throw 'Type error';
        }

        console.log(this.__currentValueMap);
        path.valueMap = new ValueMap(this.__currentValueMap);
        path.update(right_path);
        path.update(left_path);
        path.setPathValue(right_path._valueType);
    }

    __stepOutIdentifier(node, callback){
        let path, valuetype, anyValueInfo;
        path = this.acquire(node);

        if(/Function/.test(path.parent.type)){
            // Identifier is ether param or function name
            if(path.scope.variables.find(x => x.name == node.name)){
                // init param valueinfo by normal object
                valuetype = new ValueType(0x00ff,["anyType"]);
                //path.setValue(node.name, valuetype);
                this.__currentValueMap.set(node.name, valuetype);
            }
        }else if(/Catch/.test(path.parent.type)){
            // Identifier is ether param or function name
            if(path.scope.variables.find(x => x.name == node.name)){
                // init param valueinfo by normal object
                valuetype = new ValueType(0x00ff,["anyType"]);
                //path.setValue(node.name, valuetype);
                this.__currentValueMap.set(node.name, valuetype);
            }
        }

        if(this.__currentValueMap.get(node.name))  // update the value of current path
            path.setPathValue(path.valueMap.get(node.name));

        path.valueMap = new ValueMap(this.__currentValueMap);
    }

    __stepOutMemberExpression(node,callback ){
        var anyValueInfo;
        var path =   this.acquire(node); 
        var objPath = this.acquire(node.object);
        var propPath = this.acquire(node.property);
        if(objPath._valueType.__type >= 0x10 || objPath._valueType.__type&0x0004 ){   // not a literal
            var objType = this.__valueTable.get(objPath._valueType.getSymIndex(0x74)); // get the value from valueTable
            if(/Identifier/.test(node.property.type)){  // update the value of current path
                if(objType.hasProp(node.property.name)){
                    path.setPathValue(objType.getProp(node.property.name));
                }else{
                    //path._valueType = new ValueType();  // there is no prop in the obj 
                    path.setPathValue(new ValueType());
                }
            }
            else{
                // can not analysis what prop is
                //path._valueType = new ValueType(0x00ff); // valuetype init to be any type
                path.setPathValue(new ValueType(0x00ff,["anyType"]));
            }
        }
        for(let availableType of objPath._valueType.__symIndex){
            for(let [k, v] of this.__valueTable.get(availableType).__props){
                this.__currentValueMap.delete(k);
            }
        }
        if(/Identifier/.test(propPath.node.type)){
            anyValueInfo = this.__valueTable.get("anyType");
            anyValueInfo.updateProp(propPath.node.name,propPath._valueType);
        }
        path.valueMap = new ValueMap(this.__currentValueMap);
    }

    __stepOutLiteral(node, callback){
        let _path = this.acquire(node);
        switch(typeof node.value ){
            case "object": _path.setPathValue(new ValueType(0x0001)); break; // null
            case "number": _path.setPathValue(new ValueType(0x0002)); break; // Number
            case "string": _path.setPathValue(new ValueType(0x0004)); break; // String
            case "boolean": _path.setPathValue(new ValueType(0x0008)); break; // boolean
        }
        this.__currentValueMap = new ValueMap(_path.valueMap);
    }

    __stepOutLogicalExpression(node ,callback){
        let path, valuetype;
        path = this.acquire(node);
        if(path){
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
            path.setPathValue(new ValueType(0x0008));
        }
        
    }

    __stepOutObjectPattern(node, callback){
        let path, valuetype;
        path = this.acquire(node);
        if(path){
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
            path.setPathValue(new ValueType(0x0010));
        }
    }

    __stepOutSequenceExpression(node, callback){
        let path, valuetype;
        path = this.acquire(node);
        if(path){
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path);
            path.setPathValue(node.expressions[0]._valueType);
        }
    }

    __stepOutThisExpression(node, callback){ 
        // this can only avalable in function
        let path, valuetype, currentEnv;
        path = this.acquire(node);
        path.setPathValue(new ValueType(0xff,["anyType"]));
        path.valueMap = new ValueMap(this.__currentValueMap);
    }

    __stepOutUpdateExpression(node , callback){
        let path, valuetype, currentEnv;
        path = this.acquire(node);
        if(path){
            if(/Identifier/.test(node.argument.type))
            //path.setValue(node.argument.name,new ValueType(0x0002));
            this.__currentValueMap.set(node.argument.name,new ValueType(0x0002));

            path.setPathValue(new ValueType(0x0002));
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path); 
        }
    }

    __stepOutCatchClause(node, callback){
        let path, valuetype, currentEnv;
        path = this.acquire(node);
        if(path){
            if(/Identifier/.test(node.param.type))
            //path.setValue(node.argument.name,new ValueType(0x0002));
                this.__currentValueMap.delete(node.param.name);

            path.setPathValue(new ValueType());
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path); 
        }
    }

    __stepOutWithStatement(node, callback){
        let path, objPath, currentEnv;
        path = this.acquire(node);
        objPath = this.acquire(node.object);
        if(path){
            for(let availableType of objPath._valueType.__symIndex){
                for(let [k,v] of this.__valueTable.get(availableType).__props){  // for(let [k,v] of this.__valueTable.get(availableType)){ 
                    this.__currentValueMap.delete(k);
                }
            }

            path.setPathValue(new ValueType());
            path.valueMap = new ValueMap(this.__currentValueMap);
            callback(path); 
        }
    }


}

module.exports = PathManager;
