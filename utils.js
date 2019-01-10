void function(){
    module.exports.copy = Copy;
    module.exports.dump = Dump;
    module.exports.invalidMutate = InvalidMutate;
    module.exports.validMutate = ValidMutate;

    function ValidMutate(node){
        if (node["mutable"] = false){
            node["mutable"] = true;
            return;
        }
        for (var key in node) {
            if (key == "loc" || key == "insert")
                continue;
            //console.log(key + '  ' + node[key]);
            if ((typeof node[key] == "object")){
                ValidMutate(node[key])
            }
        }
    }

    function InvalidMutate(node){
        for (var key in node) {
            if (key == "loc" || key == "insert")
                continue;
            //console.log(key + '  ' + node[key]);
            if ((typeof node[key] == "object")){
                node["mutable"] = false;
                InvalidMutate(node[key])
            }
        }
    }

    function Copy(root){
        if (root == null)
            return;
        var isArray = Array.isArray(root); 
        let shadow = isArray?[]:{};
        for (key in root){
            if (key == 'loc')
                continue;
            if (typeof root[key] == "object"){
                shadow[key] = Copy(root[key]);
            }
            else{
                //console.log(key + ' ' + root[key]);
                shadow[key] = root[key];
            }
        }
        return shadow;
    }
    
    function Dump(root){
        return JSON.stringify(root);
    }
}.call(this)