设计上 Path 是一个用于表示 node 与其上下文之间关系的数据结构。整体结构沿用了 Escope 的设计，通过一个 Manager 对象存储数据，通过一个 visitor 对象获取数据。数据获取完毕之后在 Manager 对象上拥有对最顶层节点和最底层节点的两个引用。

visitor 通过递归的方式遍历 tree，从而可以将信息记录在当前节点 currentPath 上。

而在生成时，通过一个 builder 对象，在生成过程中将信息记录在当前节点 currentPath 上。这种设计可以同时支持变异的需要，在变异开始时将当前需要变异的节点的 path 设置为 builder 的 currentPath。变异时根据当前 path 中的信息生成新的 node。如果在变异过程中生成了新的影响全局的信息，也可以通过 path 传递出去

使用代理模式和工厂模式进行设计，Reference 同时使用 pathManager 和 scopeManager 来管理对象。 pathManger 管理 path 对象， scopeManager 管理 scope 对象

Path 主要的结构有  valueMap、scope、parent、predecessor、node

- scope 同 escope 设计
- valueMap 用于存放 varible 的类型信息
- parent 当前 path 对应 node 的父节点的 path
- node 当前 path 对应的 path
- predecessor 在运行过程中先于当前 node 执行的 node
- successor 在运行过程中后于当前 node 执行的 node


需要说明的是 while 和 dowhile 的循环条件 test 部分不支持定义对象，因此不对其进行专门的 scope 分析，但是需要进行专门的 path 分析