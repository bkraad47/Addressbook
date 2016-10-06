import Ember from 'ember';
// By Badruddin Kamal
//Taken from ember fire https://github.com/firebase/emberfire

export default Ember.Route.extend({
  beforeModel: function() {
	var user = this.get('firebaseApp').auth().currentUser;//Get user 
	if (user) {//If session authenticated always goto upload
		if(window.location.pathname==='/') {
			window.location.replace('/upload');
		}
	 }
    return this.get('session').fetch().catch(function() {});// Get session variable for view
  },
  firebaseApp: Ember.inject.service(),//Inject firebase
  actions: {
	 //On sign in
    signIn: function(provider) {
      this.get('session').open('firebase', { provider: provider}).then(function() {//Signin by firebase
      }).catch(function(error) {
			document.getElementById('LoginLog').innerHTML = error.code + ' - '+ error.message;
		});
    },
	// On sign out
    signOut: function() {
      this.get('session').close().catch(function(error) { //Signout by firebase
			document.getElementById('LoginLog').innerHTML = error.code + ' - '+ error.message;
		});
    }
  }
});