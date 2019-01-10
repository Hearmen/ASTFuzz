function opt(arr,o){
    arr[0] = 1.1;
    let g = {__proto__:o};
    0x10ad+1;
    arr[1] = 1.1;
}

var arr = [1,2,3];
var o = {a:1,b:2};
for(let i=0;i<1000;i++){
    opt(arr,o);
}

opt(arr,arr);

