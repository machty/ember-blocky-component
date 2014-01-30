
var get = Ember.get, set = Ember.set;

Ember.Handlebars.registerHelper('yield', function yieldHelper(arg, options) {
  if (arguments.length === 1) {
    options = arg;
    arg = null;
  } else {
    arg = Ember.Handlebars.get(this, arg, options);
  }

  var view = options.data.view;

  while (view && !get(view, 'layout')) {
    if (view._contextView) {
      view = view._contextView;
    } else {
      view = get(view, 'parentView');
    }
  }

  Ember.assert("You called yield in a template that was not a layout", !!view);

  view._yield(this, options, arg);
});

var ComposableComponentContext = Ember.ObjectProxy.extend({
  'block-param': function(paramName) {
    var param = this._params[this._blockParamIndex++];

    // define a keyword that's available
    // to the rest yielded block.

    Ember.defineProperty(this, paramName, null, param);
  },
  unknownProperty: function(name) {
    if (name[0] === ':') {
      this['block-param'](name.slice(1,-1));
    } else {
      return this._super(name);
    }
  },
  _blockParamIndex: 0
});

var ComposableComponent = Ember.Component.extend({
  getYieldContext: function(parentView, params) {
    var defaultContext = Ember.get(parentView, 'context');

    return ComposableComponentContext.create({
      content: defaultContext,
      _params: params
    });
  },

  _yield: function(context, options) {
    var view = options.data.view,
        parentView = this._parentView,
        template = get(this, 'template');

    var args = [].slice.call(arguments, 2);

    if (template) {
      Ember.assert("A Component must have a parent view in order to yield.", parentView);

      view.appendChild(Ember.View, {
        isVirtual: true,
        tagName: '',
        _contextView: parentView,
        template: template,
        context: this.getYieldContext(parentView, args),
        controller: get(parentView, 'controller'),
        templateData: { keywords: parentView.cloneKeywords() }
      });
    }
  }
});

export { ComposableComponent };

