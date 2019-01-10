
(function () {    try {   } catch (e) {    1+2; }}());

(function(){    arguments; 1+2;}());

var arrow = (a, b, c, d) => { 1+2}

var arrow = () => {    let i = 0;    var j = 20;    console.log(i);1+2;}

{    let i = 20;    i}

{    let i = 20;    var i = 20;    i;}

try {} catch ({ a, b, c, d }) {    let e = 20;    a;    b;    let c = 30;    c;    d;}

class Base {    constructor() {    }}let foo = new Base();

class Derived extends Base {    constructor() {    }}new Derived();

(function () {    var yuyushiki = 42;    (class {        [yuyushiki]() {        }        [yuyushiki + 40]() {        }    });}());

(function () {    for (var [a, b, c] in array);}());

(function () {    var [a, b, c] = array;}());

(function () {    var [a, b, ...rest] = array;}());

(function () {    var [a, b, ...[c, d, ...rest]] = array;}());

(function () {    var {        shorthand,        key: value,        hello: {            world        }    } = object;}());

(function () {    var {        shorthand,        key: [ a, b, c, d, e ],        hello: {            world        }    } = object;}());

(function () {    let i = 20;    for (let i in i) {        console.log(i);    }}());

(function () {    let i = 20;    for (let { i, j, k } in i) {        console.log(i);    }}());

(function () {    let i = 20;    let obj = {};    for (let { i, j, k } = obj; i < okok; ++i) {        console.log(i, j, k);    }}());

(function () {    var yuyushiki = 42;    ({        [yuyushiki]() {        },        [yuyushiki + 40]() {        }    })}());

({    constructor() {    }})

function foo(...bar) {    return bar;}

switch (ok) {    case hello:        let i = 20;        i;        break;    default:        let test = 30;        test;}

function bar() { q: for(;;) { break q; } }

var foo = 5;label: while (true) {  console.log(foo);  break;} // !!!! bug

function outer() {    eval(str);    var i = 20;    function inner() {        i;    }}

function outer() {    eval(str);    var i = 20;    with (obj) {        i;    }}

(function () {    with (obj) {        testing;    }}()); // !!!! bug