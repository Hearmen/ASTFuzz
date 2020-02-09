var Scope = require('./scope');
var random = require('./random');


/**
 * path 和 node 是一一对应关系
 * path 本身构成一棵二叉树
 * path 用来保存当前 node 的所有状态：这样的话就有一个问题出现，变异之后状态会改变。解决方式是在 replace 之后加一个通知，将当前的状态传递下去
 * 这样设计在遍历过程中就不能使用 visitChdren 而必须全部自己控制，escope 和 espath 必须分开
 * 变异的流程接受的状态即为 path，编译过程中对于 scope 的处理
 */
class Path{
    constructor(pathManager, node, parent, pred, scope){
        
        /**
         * reference to the current node
         */
        this.node = node;

        /**
         * reference to the parent node 
         */
        //this.parent = parent;
        this.parent = parent;

        /**
         * reference to the predcessor of current node
         */
        this.predcessor = pred;

        /**
         * reference to the successor of current node
         * node to notify
         */
        this.successor = null;

        /**
         * current scope of the current node
         */
        this.scope = scope;

        /**
         * a map record the identifer and it's valueInfo at current node
         * <id.name, valueType>
         */
        this.valueMap = new ValueMap()


        /**
         * 记录当前所表示节点的类型信息，节省了从 valueMap 中重新获取的成本，是一种用空间换时间的方法
         */
        this._valueType = new ValueType();
    }

    /**
     * 
     * @param {Identifer} id 
     * @param {ValueInfo} value 
     */
    updateValue(id,value){
        var valueInfo;
        if(valueInfo = this.valueMap.get(id)){
            valueInfo.update(value);
        }
        this.valueMap.set(id,value);
    }

    /**
     * merge the valueMap into path
     */
    update(_path, needValueType = false){
        if(_path){
            for(var [key,value] of _path.valueMap){
                var valuetype;
                if (valuetype = this.valueMap.get(key)){
                    valuetype.update(value);
                }else{
                    valuetype = new ValueType();
                    if(!value)
                        console.log(_path);
                    valuetype.update(value);
                    this.valueMap.set(key,valuetype);
                }
                
            }

            if(needValueType){
                this._valueType.update(_path._valueType);
            }
        }
    }

    /**
     * replace the value of src with dst in _path
     * @param {Path} _path 
     * @param {key} src 
     * @param {key} dst 
     */
    replaceValue(_path, src, dst){
        if(!_path.valueMap.get(dst)){
            let valueinfo = new ValueInfo();
            this.valueMap.set(src,valueinfo);
        }else{
        this.valueMap.set(src,_path.valueMap.get(dst));
        }
    }

    /**
     * 
     * @param {key} src 
     * @param {ValueInfo} value 
     */
    setValue(src, value){
        let v = value;
        if(!v){
            v = new ValueInfo();
        }
        this.valueMap.set(src, v);
    }

    setPathValue(value){
        this._valueType = value;
    }

    __exit(pathManager){
        return this.parent;
    }

    getType(){
        return this._valueType;
    }
}

class ValueMap extends Map{
    constructor(src){
        super();
        if(src){
            for(let [k, vtype] of src){
                if (vtype) {
                let newType =  new ValueType(vtype.__type, vtype.__symIndex);
                this.set(k,newType);
            }
        }
    }
    }

    /**
     * 
     * @param {name} k 
     * @param {ValueType} v 
     */
    updateValue(k,v){
        var vtype;
        if (vtype = this.get(k)){
            vtype.update(v);
        }else{
            vtype = new ValueType();
            if(!v)
                throw "error!"
            vtype.update(v);
            this.set(k,vtype);
        }
    }

    /**
     * 
     * @param {ValueMap/Map} src 
     */
    append( src ){
        for([k, vtype] of src){
            let newType =  new ValueType(vtype.__type, vtype.__symIndex);
            if(this.get(k)){
                this.get(k).update(newType);
            }else{
                this.set(k,newType);
            }
        }
    }
}

/**
 * ValueInfo 用来存放对象的类型和可用的属性
 * 
 * 
 */
class ValueInfo{
    constructor(type = 0x0010){

        /**
         * 0x0000 undefine
         * 0x0001 null
         * 0x0002 number
         * 0x0004 string
         * 0x0008 boolean
         * 0x0010 object
         * 0x0020 function
         * 0x0040 class
         * 0x0080 symbol
         */
        this.__type = type;

        /**
         * A set record the property of current Valueinfo
         * <id, valueIndex> 
         */
        this.__props = new ValueMap();
        switch(type){
            case 0x0004:
                this.__props.set("__proto__",new ValueType(0x0020,["stringType"]));
                break;
            case 0x0010:
                this.__props.set("__proto__",new ValueType(0x0020,["objectType"]));
                break;
            case 0x0020:
                this.__props.set("__proto__",new ValueType(0x0020,["funcType"]));
                break;
            case 0x0040:
                this.__props.set("__proto__",new ValueType(0x0020,["classType"]));
                break;
        }
        /**
         * if the type is a func, descript the number of param and so on
         *  ret       return value of this func
         *  proto     proto of this func
         *  params    parameter of this func
         */
        this.__desc = null;

    }


    updateType(type){
        this.__type = this.__type|type;   // 基本类型
    }

    /**
     * merge the props into current props
     */
    updateProp(props){
        if(props)
            for(let prop of props){
                this.__props.set(prop[0],prop[1]);
            }
    }

    /**
     * Merge the valueInfo into current Info
     * @param {ValueInfo} valueInfo 
     */
    update(valueInfo){
        this.updateType(valueInfo.__type);
        this.updateProp(valueInfo.__props);
    }

    deepCopy(){
        var newinfo = new ValueInfo(this.__type);
        newinfo.__props = new ValueMap(this.__props);
        // for(prop of this.__props){
        //     newinfo.__props.set(prop[0],prop[1]);
        // }
        newinfo.__desc = this.__desc;
        return newinfo;
    }

    /**
     * return props along side __proto__
     */
    getProps(){
        let properties = new ValueMap();
        let propWalker = this;

        while(propWalker.__type<0x10){
            for(let [k,v] of propWalker.__props){
                properties.set(k,v);
            }
            propWalker = propWalker.getProp("__proto__");
        };
        return properties;
    }

    hasProp(k){
        return (this.getProps().has(k));
    }

    setProp(k, v){
        this.__props.set(k,v);
    }

    /**
     * get props of current type
     */
    getProp(k){
        return this.__props.get(k);
    }

    updateProp(k, v){
        var valueType;
        if(this.hasProp(k)){
            valueType = this.__props.get(k);
            valueType.update(v);
        }else{
            this.setProp(k,v);
        }
    }
}

/**
 * ValueType 用来存放对象的类型和其在 ValueTable 中对应的 index
 * 
 * 
 */
class ValueType{
    constructor(type = 0x0000, symIndex = null){
        /**
         * __type
         * 
         * 0x0000 undefine
         * 0x0001 null
         * 0x0002 number
         * 0x0004 string
         * 0x0008 boolean
         * 0x0010 object
         * 0x0020 function
         * 0x0040 class
         * 0x0080 symbol
         */
        this.__type = type;

        /**
         * __symIndex
         * 
         * type index list in valueTable 
         */
        this.__symIndex = [];

        if(symIndex){
            this.__symIndex = symIndex.slice();
        }else{
            switch(type){
                case 0x0000:break;                                        // undefine
                case 0x0001:break;                                        // null
                case 0x0002:break;                                        // number
                case 0x0004:this.__symIndex = ["stringType"];break;       // string
                case 0x0008:break;                                        // boolean
                case 0x0010:this.__symIndex = ["objectType"];break;       // objecrt
                case 0x0020:this.__symIndex = ["functionType"];break;     // function
                case 0x0040:this.__symIndex = ["classType"];break;        // class
                case 0x0080:this.__symIndex = ["symbolType"];break;       // symbol
                default:
                    break;
            }
        }
    }

    updateType(_type){
        this.__type = this.__type|_type;   // 基本类型
    }

    updateSymIndex(_symIndex){
        for(let sym of _symIndex){
            if(!this.__symIndex.includes(sym))
                this.__symIndex.push(sym);
        }
        
    }

    /**
     * merge the two types
     */
    update(type){
        if (type) {
        this.updateType(type.__type);
        if(type.__symIndex)
            this.updateSymIndex(type.__symIndex);
        else{}  // do nothing
        }
    }

    setType(_type){
        this.__type = _type;   // 基本类型
    }

    setSymIndex(_symIndex){
        this.__symIndex = _symIndex.slice();
    }

    /**
     * replace
     */
    set(type){
        this.setType(type.__type);
        if(type.__symIndex)
            this.setSymIndex(type.__symIndex);
        else{}  // do nothing
    }

    getSymIndex(requireType = null){
        var candi = [];
        if(!requireType){
            return random.randomElement(this.__symIndex);
        }

        if(requireType&0x04){
            candi =candi.concat(this.__symIndex.filter(x=>x.includes('string')));
        }
        if(requireType&0x10){
            candi = candi.concat(this.__symIndex.filter(x=>x.includes('obj')||x.includes('array')));
        }
        if(requireType&0x20){
            candi = candi.concat(this.__symIndex.filter(x=>x.includes('func')));
        }
        if(requireType&0x40){
            candi = candi.concat(this.__symIndex.filter(x=>x.includes('class')));
        }
        candi = candi.concat(this.__symIndex.filter(x=>x.includes('any')));

        return random.randomElement(candi);
    }

    getType(){
        return this.__type;
    }
}

module.exports.path = Path;
module.exports.valueinfo = ValueInfo;
module.exports.valuetype = ValueType;
module.exports.valuemap = ValueMap;
