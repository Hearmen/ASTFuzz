(function() {
  var escope, expect, harmony;

  expect = require('chai').expect;

  harmony = require('../third_party/esprima');

  escope = require('..');

  describe('ES6 class', function() {
    it('declaration name creates class scope', function() {
      var ast, scope, scopeManager;
      ast = harmony.parse("class Derived extends Base {\n    constructor() {\n    }\n}\nnew Derived();");
      scopeManager = escope.analyze(ast, {
        ecmaVersion: 6
      });
      expect(scopeManager.scopes).to.have.length(3);
      scope = scopeManager.scopes[0];
      expect(scope.type).to.be.equal('global');
      expect(scope.block.type).to.be.equal('Program');
      expect(scope.isStrict).to.be["false"];
      expect(scope.variables).to.have.length(1);
      expect(scope.variables[0].name).to.be.equal('Derived');
      expect(scope.references).to.have.length(2);
      expect(scope.references[0].identifier.name).to.be.equal('Base');
      expect(scope.references[1].identifier.name).to.be.equal('Derived');
      scope = scopeManager.scopes[1];
      expect(scope.type).to.be.equal('class');
      expect(scope.block.type).to.be.equal('ClassDeclaration');
      expect(scope.isStrict).to.be["true"];
      expect(scope.variables).to.have.length(1);
      expect(scope.variables[0].name).to.be.equal('Derived');
      expect(scope.references).to.have.length(0);
      scope = scopeManager.scopes[2];
      expect(scope.type).to.be.equal('function');
      expect(scope.block.type).to.be.equal('FunctionExpression');
      expect(scope.isStrict).to.be["true"];
      expect(scope.variables).to.have.length(1);
      expect(scope.variables[0].name).to.be.equal('arguments');
      return expect(scope.references).to.have.length(0);
    });
    it('declaration name creates class scope', function() {
      var ast, scope, scopeManager;
      ast = harmony.parse("class Base {\n    constructor() {\n    }\n}\nlet foo = new Base();");
      scopeManager = escope.analyze(ast, {
        ecmaVersion: 6
      });
      expect(scopeManager.scopes).to.have.length(3);
      scope = scopeManager.scopes[0];
      expect(scope.type).to.be.equal('global');
      expect(scope.block.type).to.be.equal('Program');
      expect(scope.isStrict).to.be["false"];
      expect(scope.variables).to.have.length(2);
      expect(scope.variables[0].name).to.be.equal('Base');
      expect(scope.variables[1].name).to.be.equal('foo');
      expect(scope.through).to.have.length(0);
      expect(scope.references).to.have.length(2);
      expect(scope.references[0].identifier.name).to.be.equal('foo');
      expect(scope.references[1].identifier.name).to.be.equal('Base');
      scope = scopeManager.scopes[1];
      expect(scope.type).to.be.equal('class');
      expect(scope.block.type).to.be.equal('ClassDeclaration');
      expect(scope.isStrict).to.be["true"];
      expect(scope.variables).to.have.length(1);
      console.dir(scope.variables);
      expect(scope.variables[0].name).to.be.equal('Base');
      expect(scope.references).to.have.length(0);
      scope = scopeManager.scopes[2];
      expect(scope.type).to.be.equal('function');
      expect(scope.block.type).to.be.equal('FunctionExpression');
      expect(scope.isStrict).to.be["true"];
      expect(scope.variables).to.have.length(1);
      expect(scope.variables[0].name).to.be.equal('arguments');
      return expect(scope.references).to.have.length(0);
    });
    it('expression name creates class scope#1', function() {
      var ast, scope, scopeManager;
      ast = harmony.parse("(class Derived extends Base {\n    constructor() {\n    }\n});");
      scopeManager = escope.analyze(ast, {
        ecmaVersion: 6
      });
      expect(scopeManager.scopes).to.have.length(3);
      scope = scopeManager.scopes[0];
      expect(scope.type).to.be.equal('global');
      expect(scope.block.type).to.be.equal('Program');
      expect(scope.isStrict).to.be["false"];
      expect(scope.variables).to.have.length(0);
      expect(scope.references).to.have.length(1);
      expect(scope.references[0].identifier.name).to.be.equal('Base');
      scope = scopeManager.scopes[1];
      expect(scope.type).to.be.equal('class');
      expect(scope.block.type).to.be.equal('ClassExpression');
      expect(scope.isStrict).to.be["true"];
      expect(scope.variables).to.have.length(1);
      expect(scope.variables[0].name).to.be.equal('Derived');
      expect(scope.references).to.have.length(0);
      scope = scopeManager.scopes[2];
      expect(scope.type).to.be.equal('function');
      return expect(scope.block.type).to.be.equal('FunctionExpression');
    });
    it('expression name creates class scope#2', function() {
      var ast, scope, scopeManager;
      ast = harmony.parse("(class extends Base {\n    constructor() {\n    }\n});");
      scopeManager = escope.analyze(ast, {
        ecmaVersion: 6
      });
      expect(scopeManager.scopes).to.have.length(3);
      scope = scopeManager.scopes[0];
      expect(scope.type).to.be.equal('global');
      expect(scope.block.type).to.be.equal('Program');
      expect(scope.isStrict).to.be["false"];
      expect(scope.variables).to.have.length(0);
      expect(scope.references).to.have.length(1);
      expect(scope.references[0].identifier.name).to.be.equal('Base');
      scope = scopeManager.scopes[1];
      expect(scope.type).to.be.equal('class');
      expect(scope.block.type).to.be.equal('ClassExpression');
      scope = scopeManager.scopes[2];
      expect(scope.type).to.be.equal('function');
      return expect(scope.block.type).to.be.equal('FunctionExpression');
    });
    return it('computed property key may refer variables', function() {
      var ast, scope, scopeManager;
      ast = harmony.parse("(function () {\n    var yuyushiki = 42;\n    (class {\n        [yuyushiki]() {\n        }\n\n        [yuyushiki + 40]() {\n        }\n    });\n}());");
      scopeManager = escope.analyze(ast, {
        ecmaVersion: 6
      });
      expect(scopeManager.scopes).to.have.length(5);
      scope = scopeManager.scopes[0];
      expect(scope.type).to.be.equal('global');
      expect(scope.block.type).to.be.equal('Program');
      expect(scope.isStrict).to.be["false"];
      scope = scopeManager.scopes[1];
      expect(scope.type).to.be.equal('function');
      expect(scope.block.type).to.be.equal('FunctionExpression');
      expect(scope.isStrict).to.be["false"];
      expect(scope.variables).to.have.length(2);
      expect(scope.variables[0].name).to.be.equal('arguments');
      expect(scope.variables[1].name).to.be.equal('yuyushiki');
      expect(scope.references).to.have.length(1);
      expect(scope.references[0].identifier.name).to.be.equal('yuyushiki');
      scope = scopeManager.scopes[2];
      expect(scope.type).to.be.equal('class');
      expect(scope.block.type).to.be.equal('ClassExpression');
      expect(scope.isStrict).to.be["true"];
      expect(scope.variables).to.have.length(0);
      expect(scope.references).to.have.length(2);
      expect(scope.references[0].identifier.name).to.be.equal('yuyushiki');
      return expect(scope.references[1].identifier.name).to.be.equal('yuyushiki');
    });
  });

}).call(this);

//# sourceMappingURL=data:application/json;base64,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QUssQ0FBQyxJQUFuQixDQUF3QixDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBL0IsQ0FBc0MsaUJBQXRDLENBakNBLENBQUE7QUFBQSxNQWtDQSxNQUFBLENBQU8sS0FBSyxDQUFDLFFBQWIsQ0FBc0IsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQUQsQ0FsQzVCLENBQUE7QUFBQSxNQW1DQSxNQUFBLENBQU8sS0FBSyxDQUFDLFNBQWIsQ0FBdUIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQWhDLENBQXVDLENBQXZDLENBbkNBLENBQUE7QUFBQSxNQW9DQSxNQUFBLENBQU8sS0FBSyxDQUFDLFVBQWIsQ0FBd0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQWpDLENBQXdDLENBQXhDLENBcENBLENBQUE7QUFBQSxNQXFDQSxNQUFBLENBQU8sS0FBSyxDQUFDLFVBQVcsQ0FBQSxDQUFBLENBQUUsQ0FBQyxVQUFVLENBQUMsSUFBdEMsQ0FBMkMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQWxELENBQXlELFdBQXpELENBckNBLENBQUE7YUFzQ0EsTUFBQSxDQUFPLEtBQUssQ0FBQyxVQUFXLENBQUEsQ0FBQSxDQUFFLENBQUMsVUFBVSxDQUFDLElBQXRDLENBQTJDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFsRCxDQUF5RCxXQUF6RCxFQXZDNEM7SUFBQSxDQUFoRCxFQTFJa0I7RUFBQSxDQUF0QixDQUpBLENBQUE7QUFBQSIsImZpbGUiOiJlczYtY2xhc3MuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIjIC0qLSBjb2Rpbmc6IHV0Zi04IC0qLVxuIyAgQ29weXJpZ2h0IChDKSAyMDE0IFl1c3VrZSBTdXp1a2kgPHV0YXRhbmUudGVhQGdtYWlsLmNvbT5cbiNcbiMgIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuIyAgbW9kaWZpY2F0aW9uLCBhcmUgcGVybWl0dGVkIHByb3ZpZGVkIHRoYXQgdGhlIGZvbGxvd2luZyBjb25kaXRpb25zIGFyZSBtZXQ6XG4jXG4jICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiMgICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIuXG4jICAgICogUmVkaXN0cmlidXRpb25zIGluIGJpbmFyeSBmb3JtIG11c3QgcmVwcm9kdWNlIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiMgICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4jICAgICAgZG9jdW1lbnRhdGlvbiBhbmQvb3Igb3RoZXIgbWF0ZXJpYWxzIHByb3ZpZGVkIHdpdGggdGhlIGRpc3RyaWJ1dGlvbi5cbiNcbiMgIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4jICBBTkQgQU5ZIEVYUFJFU1MgT1IgSU1QTElFRCBXQVJSQU5USUVTLCBJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgVEhFXG4jICBJTVBMSUVEIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZIEFORCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRVxuIyAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuIyAgRElSRUNULCBJTkRJUkVDVCwgSU5DSURFTlRBTCwgU1BFQ0lBTCwgRVhFTVBMQVJZLCBPUiBDT05TRVFVRU5USUFMIERBTUFHRVNcbiMgIChJTkNMVURJTkcsIEJVVCBOT1QgTElNSVRFRCBUTywgUFJPQ1VSRU1FTlQgT0YgU1VCU1RJVFVURSBHT09EUyBPUiBTRVJWSUNFUztcbiMgIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuIyAgT04gQU5ZIFRIRU9SWSBPRiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQ09OVFJBQ1QsIFNUUklDVCBMSUFCSUxJVFksIE9SIFRPUlRcbiMgIChJTkNMVURJTkcgTkVHTElHRU5DRSBPUiBPVEhFUldJU0UpIEFSSVNJTkcgSU4gQU5ZIFdBWSBPVVQgT0YgVEhFIFVTRSBPRlxuIyAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cblxuZXhwZWN0ID0gcmVxdWlyZSgnY2hhaScpLmV4cGVjdFxuaGFybW9ueSA9IHJlcXVpcmUgJy4uL3RoaXJkX3BhcnR5L2VzcHJpbWEnXG5lc2NvcGUgPSByZXF1aXJlICcuLidcblxuZGVzY3JpYmUgJ0VTNiBjbGFzcycsIC0+XG4gICAgaXQgJ2RlY2xhcmF0aW9uIG5hbWUgY3JlYXRlcyBjbGFzcyBzY29wZScsIC0+XG4gICAgICAgIGFzdCA9IGhhcm1vbnkucGFyc2UgXCJcIlwiXG4gICAgICAgIGNsYXNzIERlcml2ZWQgZXh0ZW5kcyBCYXNlIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG5ldyBEZXJpdmVkKCk7XG4gICAgICAgIFwiXCJcIlxuXG4gICAgICAgIHNjb3BlTWFuYWdlciA9IGVzY29wZS5hbmFseXplIGFzdCwgZWNtYVZlcnNpb246IDZcbiAgICAgICAgZXhwZWN0KHNjb3BlTWFuYWdlci5zY29wZXMpLnRvLmhhdmUubGVuZ3RoIDNcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMF1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdnbG9iYWwnXG4gICAgICAgIGV4cGVjdChzY29wZS5ibG9jay50eXBlKS50by5iZS5lcXVhbCAnUHJvZ3JhbSdcbiAgICAgICAgZXhwZWN0KHNjb3BlLmlzU3RyaWN0KS50by5iZS5mYWxzZVxuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzKS50by5oYXZlLmxlbmd0aCAxXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXNbMF0ubmFtZSkudG8uYmUuZXF1YWwgJ0Rlcml2ZWQnXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzKS50by5oYXZlLmxlbmd0aCAyXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzWzBdLmlkZW50aWZpZXIubmFtZSkudG8uYmUuZXF1YWwgJ0Jhc2UnXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzWzFdLmlkZW50aWZpZXIubmFtZSkudG8uYmUuZXF1YWwgJ0Rlcml2ZWQnXG5cbiAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuc2NvcGVzWzFdXG4gICAgICAgIGV4cGVjdChzY29wZS50eXBlKS50by5iZS5lcXVhbCAnY2xhc3MnXG4gICAgICAgIGV4cGVjdChzY29wZS5ibG9jay50eXBlKS50by5iZS5lcXVhbCAnQ2xhc3NEZWNsYXJhdGlvbidcbiAgICAgICAgZXhwZWN0KHNjb3BlLmlzU3RyaWN0KS50by5iZS50cnVlXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXMpLnRvLmhhdmUubGVuZ3RoIDFcbiAgICAgICAgZXhwZWN0KHNjb3BlLnZhcmlhYmxlc1swXS5uYW1lKS50by5iZS5lcXVhbCAnRGVyaXZlZCdcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXMpLnRvLmhhdmUubGVuZ3RoIDBcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMl1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdmdW5jdGlvbidcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdGdW5jdGlvbkV4cHJlc3Npb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5pc1N0cmljdCkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzKS50by5oYXZlLmxlbmd0aCAxXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXNbMF0ubmFtZSkudG8uYmUuZXF1YWwgJ2FyZ3VtZW50cydcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXMpLnRvLmhhdmUubGVuZ3RoIDBcblxuICAgIGl0ICdkZWNsYXJhdGlvbiBuYW1lIGNyZWF0ZXMgY2xhc3Mgc2NvcGUnLCAtPlxuICAgICAgICBhc3QgPSBoYXJtb255LnBhcnNlIFwiXCJcIlxuICAgICAgICBjbGFzcyBCYXNlIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGxldCBmb28gPSBuZXcgQmFzZSgpO1xuICAgICAgICBcIlwiXCJcblxuICAgICAgICBzY29wZU1hbmFnZXIgPSBlc2NvcGUuYW5hbHl6ZSBhc3QsIGVjbWFWZXJzaW9uOiA2XG4gICAgICAgIGV4cGVjdChzY29wZU1hbmFnZXIuc2NvcGVzKS50by5oYXZlLmxlbmd0aCAzXG5cbiAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuc2NvcGVzWzBdXG4gICAgICAgIGV4cGVjdChzY29wZS50eXBlKS50by5iZS5lcXVhbCAnZ2xvYmFsJ1xuICAgICAgICBleHBlY3Qoc2NvcGUuYmxvY2sudHlwZSkudG8uYmUuZXF1YWwgJ1Byb2dyYW0nXG4gICAgICAgIGV4cGVjdChzY29wZS5pc1N0cmljdCkudG8uYmUuZmFsc2VcbiAgICAgICAgZXhwZWN0KHNjb3BlLnZhcmlhYmxlcykudG8uaGF2ZS5sZW5ndGggMlxuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzWzBdLm5hbWUpLnRvLmJlLmVxdWFsICdCYXNlJ1xuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzWzFdLm5hbWUpLnRvLmJlLmVxdWFsICdmb28nXG4gICAgICAgIGV4cGVjdChzY29wZS50aHJvdWdoKS50by5oYXZlLmxlbmd0aCAwXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzKS50by5oYXZlLmxlbmd0aCAyXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzWzBdLmlkZW50aWZpZXIubmFtZSkudG8uYmUuZXF1YWwgJ2ZvbydcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXNbMV0uaWRlbnRpZmllci5uYW1lKS50by5iZS5lcXVhbCAnQmFzZSdcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMV1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdjbGFzcydcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdDbGFzc0RlY2xhcmF0aW9uJ1xuICAgICAgICBleHBlY3Qoc2NvcGUuaXNTdHJpY3QpLnRvLmJlLnRydWVcbiAgICAgICAgZXhwZWN0KHNjb3BlLnZhcmlhYmxlcykudG8uaGF2ZS5sZW5ndGggMVxuICAgICAgICBjb25zb2xlLmRpciBzY29wZS52YXJpYWJsZXNcbiAgICAgICAgZXhwZWN0KHNjb3BlLnZhcmlhYmxlc1swXS5uYW1lKS50by5iZS5lcXVhbCAnQmFzZSdcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXMpLnRvLmhhdmUubGVuZ3RoIDBcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMl1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdmdW5jdGlvbidcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdGdW5jdGlvbkV4cHJlc3Npb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5pc1N0cmljdCkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzKS50by5oYXZlLmxlbmd0aCAxXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXNbMF0ubmFtZSkudG8uYmUuZXF1YWwgJ2FyZ3VtZW50cydcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXMpLnRvLmhhdmUubGVuZ3RoIDBcblxuICAgIGl0ICdleHByZXNzaW9uIG5hbWUgY3JlYXRlcyBjbGFzcyBzY29wZSMxJywgLT5cbiAgICAgICAgYXN0ID0gaGFybW9ueS5wYXJzZSBcIlwiXCJcbiAgICAgICAgKGNsYXNzIERlcml2ZWQgZXh0ZW5kcyBCYXNlIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXCJcIlwiXG5cbiAgICAgICAgc2NvcGVNYW5hZ2VyID0gZXNjb3BlLmFuYWx5emUgYXN0LCBlY21hVmVyc2lvbjogNlxuICAgICAgICBleHBlY3Qoc2NvcGVNYW5hZ2VyLnNjb3BlcykudG8uaGF2ZS5sZW5ndGggM1xuXG4gICAgICAgIHNjb3BlID0gc2NvcGVNYW5hZ2VyLnNjb3Blc1swXVxuICAgICAgICBleHBlY3Qoc2NvcGUudHlwZSkudG8uYmUuZXF1YWwgJ2dsb2JhbCdcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdQcm9ncmFtJ1xuICAgICAgICBleHBlY3Qoc2NvcGUuaXNTdHJpY3QpLnRvLmJlLmZhbHNlXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXMpLnRvLmhhdmUubGVuZ3RoIDBcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXMpLnRvLmhhdmUubGVuZ3RoIDFcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXNbMF0uaWRlbnRpZmllci5uYW1lKS50by5iZS5lcXVhbCAnQmFzZSdcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMV1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdjbGFzcydcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdDbGFzc0V4cHJlc3Npb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5pc1N0cmljdCkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzKS50by5oYXZlLmxlbmd0aCAxXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXNbMF0ubmFtZSkudG8uYmUuZXF1YWwgJ0Rlcml2ZWQnXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzKS50by5oYXZlLmxlbmd0aCAwXG5cbiAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuc2NvcGVzWzJdXG4gICAgICAgIGV4cGVjdChzY29wZS50eXBlKS50by5iZS5lcXVhbCAnZnVuY3Rpb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5ibG9jay50eXBlKS50by5iZS5lcXVhbCAnRnVuY3Rpb25FeHByZXNzaW9uJ1xuXG4gICAgaXQgJ2V4cHJlc3Npb24gbmFtZSBjcmVhdGVzIGNsYXNzIHNjb3BlIzInLCAtPlxuICAgICAgICBhc3QgPSBoYXJtb255LnBhcnNlIFwiXCJcIlxuICAgICAgICAoY2xhc3MgZXh0ZW5kcyBCYXNlIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdG9yKCkge1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXCJcIlwiXG5cbiAgICAgICAgc2NvcGVNYW5hZ2VyID0gZXNjb3BlLmFuYWx5emUgYXN0LCBlY21hVmVyc2lvbjogNlxuICAgICAgICBleHBlY3Qoc2NvcGVNYW5hZ2VyLnNjb3BlcykudG8uaGF2ZS5sZW5ndGggM1xuXG4gICAgICAgIHNjb3BlID0gc2NvcGVNYW5hZ2VyLnNjb3Blc1swXVxuICAgICAgICBleHBlY3Qoc2NvcGUudHlwZSkudG8uYmUuZXF1YWwgJ2dsb2JhbCdcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdQcm9ncmFtJ1xuICAgICAgICBleHBlY3Qoc2NvcGUuaXNTdHJpY3QpLnRvLmJlLmZhbHNlXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXMpLnRvLmhhdmUubGVuZ3RoIDBcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXMpLnRvLmhhdmUubGVuZ3RoIDFcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXNbMF0uaWRlbnRpZmllci5uYW1lKS50by5iZS5lcXVhbCAnQmFzZSdcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMV1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdjbGFzcydcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdDbGFzc0V4cHJlc3Npb24nXG5cbiAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuc2NvcGVzWzJdXG4gICAgICAgIGV4cGVjdChzY29wZS50eXBlKS50by5iZS5lcXVhbCAnZnVuY3Rpb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5ibG9jay50eXBlKS50by5iZS5lcXVhbCAnRnVuY3Rpb25FeHByZXNzaW9uJ1xuXG4gICAgaXQgJ2NvbXB1dGVkIHByb3BlcnR5IGtleSBtYXkgcmVmZXIgdmFyaWFibGVzJywgLT5cbiAgICAgICAgYXN0ID0gaGFybW9ueS5wYXJzZSBcIlwiXCJcbiAgICAgICAgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB5dXl1c2hpa2kgPSA0MjtcbiAgICAgICAgICAgIChjbGFzcyB7XG4gICAgICAgICAgICAgICAgW3l1eXVzaGlraV0oKSB7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgW3l1eXVzaGlraSArIDQwXSgpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSgpKTtcbiAgICAgICAgXCJcIlwiXG5cbiAgICAgICAgc2NvcGVNYW5hZ2VyID0gZXNjb3BlLmFuYWx5emUgYXN0LCBlY21hVmVyc2lvbjogNlxuICAgICAgICBleHBlY3Qoc2NvcGVNYW5hZ2VyLnNjb3BlcykudG8uaGF2ZS5sZW5ndGggNVxuXG4gICAgICAgIHNjb3BlID0gc2NvcGVNYW5hZ2VyLnNjb3Blc1swXVxuICAgICAgICBleHBlY3Qoc2NvcGUudHlwZSkudG8uYmUuZXF1YWwgJ2dsb2JhbCdcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdQcm9ncmFtJ1xuICAgICAgICBleHBlY3Qoc2NvcGUuaXNTdHJpY3QpLnRvLmJlLmZhbHNlXG5cbiAgICAgICAgc2NvcGUgPSBzY29wZU1hbmFnZXIuc2NvcGVzWzFdXG4gICAgICAgIGV4cGVjdChzY29wZS50eXBlKS50by5iZS5lcXVhbCAnZnVuY3Rpb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5ibG9jay50eXBlKS50by5iZS5lcXVhbCAnRnVuY3Rpb25FeHByZXNzaW9uJ1xuICAgICAgICBleHBlY3Qoc2NvcGUuaXNTdHJpY3QpLnRvLmJlLmZhbHNlXG4gICAgICAgIGV4cGVjdChzY29wZS52YXJpYWJsZXMpLnRvLmhhdmUubGVuZ3RoIDJcbiAgICAgICAgZXhwZWN0KHNjb3BlLnZhcmlhYmxlc1swXS5uYW1lKS50by5iZS5lcXVhbCAnYXJndW1lbnRzJ1xuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzWzFdLm5hbWUpLnRvLmJlLmVxdWFsICd5dXl1c2hpa2knXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzKS50by5oYXZlLmxlbmd0aCAxXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzWzBdLmlkZW50aWZpZXIubmFtZSkudG8uYmUuZXF1YWwgJ3l1eXVzaGlraSdcblxuICAgICAgICBzY29wZSA9IHNjb3BlTWFuYWdlci5zY29wZXNbMl1cbiAgICAgICAgZXhwZWN0KHNjb3BlLnR5cGUpLnRvLmJlLmVxdWFsICdjbGFzcydcbiAgICAgICAgZXhwZWN0KHNjb3BlLmJsb2NrLnR5cGUpLnRvLmJlLmVxdWFsICdDbGFzc0V4cHJlc3Npb24nXG4gICAgICAgIGV4cGVjdChzY29wZS5pc1N0cmljdCkudG8uYmUudHJ1ZVxuICAgICAgICBleHBlY3Qoc2NvcGUudmFyaWFibGVzKS50by5oYXZlLmxlbmd0aCAwXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzKS50by5oYXZlLmxlbmd0aCAyXG4gICAgICAgIGV4cGVjdChzY29wZS5yZWZlcmVuY2VzWzBdLmlkZW50aWZpZXIubmFtZSkudG8uYmUuZXF1YWwgJ3l1eXVzaGlraSdcbiAgICAgICAgZXhwZWN0KHNjb3BlLnJlZmVyZW5jZXNbMV0uaWRlbnRpZmllci5uYW1lKS50by5iZS5lcXVhbCAneXV5dXNoaWtpJ1xuXG4jIHZpbTogc2V0IHN3PTQgdHM9NCBldCB0dz04MCA6XG4iXX0=