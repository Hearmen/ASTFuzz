var var_x1 = {
    prop_x1: 1,
    prop_x2: 1,
    prop_x3: 1,
    prop_x4: 1
};
var var_x2 = [
    1,
    2,
    3,
    4,
    5,
    6,
    7
];
var var_x3 = [
    [],
    [],
    [],
    [],
    []
];
var var_x4 = [
    1.1,
    2.2,
    3.3,
    4.4,
    5.5
];
var var_x5 = [
    1,
    2,
    3,
    4,
    5,
    6,
    7
];
delete var_x5[3];
var var_x6 = [
    [],
    [],
    [],
    [],
    []
];
delete var_x6[3];
var var_x7 = [
    1.1,
    2.2,
    3.3,
    4.4,
    5.5
];
delete var_x7[3];
var var_x8 = new Array(10).fill(0);
var_x8.length = 100;
var var_x9 = new Array(10).fill([]);
var_x9.length = 100;
var var_x10 = new Array(10).fill(1.1);
var_x10.length = 100;
var var_x11 = {};
{
    var interestContol = 0;
    for (let i = 5; i < 133; i++) {
        var_x11['prop_x' + i] = 1;
        if (interestContol++ < 10000)
            break;
    }
}
var var_x12 = {
    prop_x133: 1,
    prop_x134: 2
};
var_x12.prop_x135 = 1;
delete var_x12.prop_x133;
var var_x13 = [0];
var_x13[256] = 1;
var_x13[4096] = 2;
var_x13[65536] = 3;
var_x13[1048576] = 3;
var __proto__ = [];
var var_x14 = { __proto__ };
var var_c1 = 1;
var var_c2 = 1.1;
var var_c3 = 2147483647;
var var_c4 = 4294967295;
var var_c5 = 2147647490;
var var_c6 = 0;
var var_c7 = 1073741823;
var var_c8 = 18446744073709552000;
function func_x0() {
}
;
function func_x1() {
    return var_x1;
}
;
function func_x2() {
    return var_x2;
}
;
function func_x3() {
    return var_x3;
}
;
function func_x4() {
    return var_x4;
}
;
function func_x5() {
    return var_x5;
}
;
function func_x6() {
    return var_x6;
}
;
var print = function (a) {
    return a + '';
};
var alert = print;
var console = { log: print };
var readbuffer = print;
var printObj = print;
var WScript = {
    Echo: print,
    LoadScriptFile: print,
    Arguments: [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8
    ],
    Platform: { BUILD_TYPE: 'release' },
    LoadModule: function (s) {
        try {
            eval(s);
        } catch (e) {
        }
    },
    LoadScript: function (s) {
        try {
            eval(s);
        } catch (e) {
        }
    },
    RegisterCrossThreadInterfacePS: print,
    RegisterModuleSource: print,
    Flag: print,
    Attach: print,
    SetTimeout: print,
    Quit: print,
    DumpFunctionPosition: print
};
var testRunner = {
    runTests: function (tests) {
        for (let i in tests) {
            try {
                tests[i].body();
            } catch (e) {
            }
        }
    },
    run: function (tests) {
        for (let i in tests) {
            try {
                tests[i].body();
            } catch (e) {
            }
        }
    }
};
var assert = {
    strictEqual: function () {
    },
    areEqual: function () {
    },
    areNotEqual: function () {
    },
    areAlmostEqual: function () {
    },
    isTrue: function () {
    },
    isFalse: function () {
    },
    isUndefined: function () {
    },
    isNotUndefined: function () {
    },
    throws: function () {
    },
    doesNotThrow: function () {
    },
    fail: function () {
    },
    matches: function () {
    }
};
var helpers = {
    isInBrowser: false,
    isCompatVersion9: false,
    isVersion10OrLater: true,
    getDummyObject: function () {
        return {};
    },
    writeln: print,
    printObject: print,
    withPropertyDeleted: print,
    getTypeOf: print,
    getFileAndLineInfo: print
};
var CollectGarbage = function () {
    var interestContol = 0;
    {
        var interestContol = 0;
        for (let i = 0; i < 1000; i++) {
            var ab = new ArrayBuffer(4096);
            if (interestContol++ < 10000)
                break;
            if (interestContol++ < 10000)
                break;
        }
    }
};
var gc = CollectGarbage;
var TrimStackTracePath = function () {
};
4269 + 48879;


function test0() {
    function leaf() { return 100; };
    var obj1 = {};
    var arrObj0 = {};
    var func0 = function (argMath0, argArr1, argObj2) {
        var __loopvar16 = 0;
        while ((1) && __loopvar16 < 3) {
            __loopvar16++;
            argArr1[((((leaf.call(argObj2) % (0 ? 2147483647 : -7.33527460009626E+18)) >= 0 ? (leaf.call(argObj2) % (0 ? 2147483647 : -7.33527460009626E+18)) : 0)) & 0XF)] = (--obj1.prop0);
            obj1.length *= argArr1[(16)];
        }
    }
    var ui16 = new Uint16Array(256);
    var intary = [4, 66, 767, -100, 0, 1213, 34, 42, 55, -123, 567, 77, -234, 88, 11, -66];
    var __loopvar1 = 0;
    for (var strvar0 in ui16) {
        if (strvar0.indexOf('method') != -1) continue;
        if (__loopvar1++ > 3) break;
        obj1.prop0 = 1;
        var __loopvar3 = 0;
        do {
            __loopvar3++;
            obj1.prop0 = func0.call(obj1, 1, intary, 1);
        } while ((1) && __loopvar3 < 3)
        intary[(18)] = (arrObj0.length--);
    }
};

// generate profile
test0();
test0();
test0();