import { ComposableComponent } from "ember-composable-component";

var App;

module("Composable Component", {
  setup: function() {
    Ember.Test.setupUnitTest({injectHelpers: true});
  },
  teardown: function() {
    Ember.run(Ember.Test.teardownUnitTest);
  }
});

test("it exists", function() {
  ok(ComposableComponent);
});

test("it's a subclass of Ember.Component", function() {
  ok(Ember.Component.detect(ComposableComponent));
});

test("an each helper", function() {
  registerComponent('fancy-each', ComposableComponent.extend({ }));
  registerTemplate('components/fancy-each', Ember.Handlebars.compile('{{#each item in items}}{{yield item}}{{/each}}'));

  var context = {
    people: [
      { name: 'Alex' },
      { name: 'Kris' },
      { name: 'Erik' }
    ]
  };

  testSnippet('{{#fancy-each items=people}}{{:p:}}Hello {{p.name}}. {{/fancy-each}}', context).then(function(view) {
    equal(view.$().text(), 'Hello Alex. Hello Kris. Hello Erik. ');
  });
});



