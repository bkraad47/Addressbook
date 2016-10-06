import Ember from 'ember';
import config from './config/environment';
// By Badruddin Kamal

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('upload');
  this.route('history');
});

export default Router;
