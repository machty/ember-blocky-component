document.write('<div id="ember-testing-container"><div id="ember-testing"></div></div>');

// from: https://gist.github.com/rpflorence/a904e476385cc76bb290
// TODO: put this into its own file.
(function() {

  var container;
  var adapter;
  var fixture;
  var injectHelpers;
  var Resolver;
  var namespace;

  Ember.Test._injectable = [
    'Component',
    'Controller',
    'Route',
    'Template',
    'View',
    'Helper'
  ];

  Ember.Test.setupUnitTest = function(config) {
    config = config || {};
    adapter = config.adapter || Ember.Test.QUnitAdapter.create();
    fixture = config.fixture || '#qunit-fixture';
    Resolver = config.Resolver;
    namespace = config.namespace;
    injectHelpers = config.injectHelpers;
    container = testContainer();
    createHelpers();
  };

  Ember.Test.teardownUnitTest = function() {
    container.destroy();
  };

  function testUnit(fullName, options) {
    if (options) {
      var klass = container.lookupFactory(fullName);
      klass.reopen(options);
    }

    var unit = container.lookup(fullName);
    adapter.asyncStart();
    return new Ember.RSVP.Promise(function(resolve) {
      var isView = fullName.match(/^(component|view):/);
      if (isView) {
        unit.appendTo(fixture);
        Ember.run.schedule('afterRender', function() {
          adapter.asyncEnd();
          Ember.run(null, resolve, unit);
        });
      } else {
        adapter.asyncEnd();
        Ember.run(null, resolve, unit);
      }
    });
  }

  function register(fullName, Unit) {
    container.register(fullName, Unit);
    maybeRegisterComponentLayout(fullName);
  }

  function createHelpers() {
    var target = injectHelpers ? window : Ember.Test;
    Ember.A(Ember.Test._injectable).forEach(function(type) {
      // create registerComponent, etc.
      target['register'+type] = function(name, Unit) {
        var fullName = type.toLowerCase()+':'+name;
        register(fullName, Unit);
      };
      if (type === 'Template') return;
      // create registerComponent, etc.
      target['test'+type] = function(name, options) {
        return testUnit(type.toLowerCase()+':'+name, options);
      };
    });
    target.findView = function(id) {
      return Ember.View.views[id];
    };
    target.testSnippet = testSnippet;
  }

  function testSnippet(html, context) {
    var name = '__GENERATED_TEST_VIEW__';
    var hash = {
      templateName: name
    };
    if (context) {
      hash.context = context;
    }
    var View = Ember.View.extend(hash);
    registerView(name, View);
    registerTemplate(name, Ember.Handlebars.compile(html));
    return testView(name);
  }

  function maybeRegisterComponentLayout(fullName) {
    var split = fullName.split(':');
    var type = split[0];
    if (type !== 'template') return;
    var name = split[1];
    var templatePath = name.split('/');
    var isComponent = templatePath[0] === 'components';
    if (isComponent) {
      var componentName = templatePath[1];
      container.injection('component:'+componentName, 'layout', fullName);
    }
  }

  // kind of duplicate code for test apps
  function testContainer() {
    // TODO: figure out namespaces/resolvers
    var container = new Ember.Container();
    container.optionsForType('component', { singleton: false });
    container.optionsForType('view', { singleton: false });
    container.optionsForType('template', { instantiate: false });
    container.optionsForType('helper', { instantiate: false });
    container.register('component-lookup:main', Ember.ComponentLookup);
    if (Resolver) {
      container.resolver  = resolverFor(namespace);
      container.normalize = container.resolver.normalize;
      container.describe  = container.resolver.describe;
      container.makeToString = container.resolver.makeToString;
    }
    return container;
  }

  // duplicate code with apps
  function resolverFor(namespace) {
    var resolver = Resolver.create({
      namespace: namespace
    });

    function resolve(fullName) {
      var split = fullName.split(':');
      if (split[0] === 'component') {
        var componentName = split[1];
        var templateFullName = 'template:components/'+componentName;
        var template = resolve(templateFullName);
        if (template) {
          container.injection(fullName, 'layout', templateFullName);
        }
      }
      return resolver.resolve(fullName);
    }

    resolve.describe = function(fullName) {
      return resolver.lookupDescription(fullName);
    };

    resolve.makeToString = function(factory, fullName) {
      return resolver.makeToString(factory, fullName);
    };

    resolve.normalize = function(fullName) {
      if (resolver.normalize) {
        return resolver.normalize(fullName);
      } else {
        Ember.deprecate('The Resolver should now provide a \'normalize\' function', false);
        return fullName;
      }
    };

    return resolve;
  }

})();

Ember.testing = true;

//window.startApp          = require('appkit/tests/helpers/start_app')['default'];
//window.isolatedContainer = require('appkit/tests/helpers/isolated_container')['default'];

function startApp(attrs) {
  var App;

  var attributes = Ember.merge({
    // useful Test defaults
    rootElement: '#ember-testing',
    LOG_ACTIVE_GENERATION:false,
    LOG_VIEW_LOOKUPS: false
  }, attrs); // but you can override;

  Ember.run.join(function(){
    App = Ember.Application.create(attributes);

    App.Router.reopen({
      location: 'none'
    });

    App.setupForTesting();
    App.injectTestHelpers();
  });


  App.reset(); // this shouldn't be needed, i want to be able to "start an app at a specific URL"

  return App;
}



// Override global QUnit functions to add promise support
// so that we can, for instance, run some ajax queries before
// running our test case.
window.setupPromise = null;
window.test = function(name, fn, testIsAsync) {
  QUnit.asyncTest.call(this, name, function() {
    Ember.run(function() {
      var testPromise = Ember.RSVP.resolve(window.setupPromise)
                                  .then(fn);

      if (!testIsAsync) {
        testPromise = testPromise.then(start);
      }

      testPromise = testPromise.catch(function(e) {
        ok(false, "Error returned from test promise chain: " + e.message ? e.message : "Unknown error");
      });
    });

    window.setupPromise = null;
  });
};

window.asyncTest = function(name, fn) {
  return window.test(name, fn, true);
};

window.module = function(name, options) {
  options = options || {};
  var setup = options.setup || function() {};
  options.setup = function() {
    window.setupPromise = setup();
  };

  QUnit.module(name, options);
};


function exists(selector) {
  return !!find(selector).length;
}

function getAssertionMessage(actual, expected, message) {
  return message || QUnit.jsDump.parse(expected) + " expected but was " + QUnit.jsDump.parse(actual);
}

function equal(actual, expected, message) {
  message = getAssertionMessage(actual, expected, message);
  QUnit.equal.call(this, actual, expected, message);
}

function strictEqual(actual, expected, message) {
  message = getAssertionMessage(actual, expected, message);
  QUnit.strictEqual.call(this, actual, expected, message);
}

QUnit.extend(QUnit,{
  hasSameElems: function(actual, expected, message){
    for (var i = actual.length - 1; i >= 0; i--) {
      if(expected.indexOf(actual[i]) === -1){
        ok(false, message+': Found "'+actual[i]+'" which is not in the expected list');
        return;
      }
    }
    ok(actual.length === expected.length, message);
  }
});

function hasSameElems(actual, expected, message) {
    message = getAssertionMessage(actual, expected, message);
    QUnit.hasSameElems.call(this, actual, expected, message);
}
window.exists = exists;
window.equal = equal;
window.strictEqual = strictEqual;
window.hasSameElems = hasSameElems;

