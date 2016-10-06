import DS from 'ember-data';
// By Badruddin Kamal

// Store data model for client data
export default DS.Model.extend({
  name: DS.attr('string'),
  email: DS.attr('string')
});
