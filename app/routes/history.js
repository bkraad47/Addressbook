import Ember from 'ember';
// By Badruddin Kamal


export default Ember.Route.extend({
	firebaseApp: Ember.inject.service(),//Inject firebase
	model() {
		var usid=this.get('firebaseApp').auth().currentUser.uid; //Get user id
		var self=this;// remmeber current object
		
		//Call DB data ** ember data error with query so data mgmt done manually
		this.get('firebaseApp').database().ref('/addressbook/'+usid+'/').once('value').then(function(snapshot) {
							
							//For each db value store it in client model
							for(var contactKey in snapshot.val()){
							
								self.store.createRecord('contact',{
									name:snapshot.val()[contactKey].name,
									email:snapshot.val()[contactKey].email
									});
							}
							
							
							
						 });
		//Return client model for display
		return self.store.findAll('contact');
	}
	
});
