## Ember Block-y Component

Some ideas I've had about making `Ember.Component` even better.

### Motivation

Read this: https://gist.github.com/machty/30dd8ea75096c79e0104

I want two things:

1. It should be easy to yield content from a component into a provided
   template block.
2. No tricky scoping rules that border on `instant_eval`

I want Ruby block scoping rules for components, e.g.

  people.each do |p|
    puts p.firstName
  end

Would have an Ember-Handlebars equivalent of:

  {{#for-each items=people}}{{:p:}}
    {{p.firstName}}
  {{/for-each}}

Basically, the template block has controller over how its scope will be
affected by the content being yielded to it by the component; therefore,
no tricky scoping rules, no accidental shadowing of variables imposed by
the component, familiar Ruby block scoping rules, etc.

`Ember.ComposableComponent` makes this possible. I'll add more examples
soon.

