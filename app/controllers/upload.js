import Ember from 'ember';
// By Badruddin Kamal

export default Ember.Controller.extend({
   firebaseApp: Ember.inject.service(),//Inject firebase
  actions: {
	  
	//On file upload
    UploadFile: function() {
		var usid=this.get('firebaseApp').auth().currentUser.uid;//Get usser id
		
		// Get file item
		var fileobj = document.getElementById("UploadFileItem");// Get file
		var file= fileobj.files[0];//Process file
		var ext=file.name.split('.');//Extract file name
		var self=this;//Remember object reference
		
		self.set('uploadLog', 'Loading please wait.....'); //Set out put
		
								// Read file
								if( "csv"===ext[ext.length-1]){//If file format correct
								
								//Regex for name and email
								var regexEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			                    var regexName = /^[a-zA-Z ]{2,30}$/;
									  var reader = new FileReader();//Initialize file reader
									  
									  //Initialize values
									  var disputedObj=[];
									  var updates = {};
									  
									  reader.onload = function(){ //Read file
										//Initialize variables
									    var dataCheck=true;//Data sanity check flag
									    var lineData;
									   
										//Read By lines
										var lines = this.result.split('\n');
										for(var line = 0; line < lines.length; line++){
											
										  lineData=lines[line].split(',');//Get contents
										  
										  //Remove CR LF
										  lineData[1]=lineData[1].replace('\n','');
										  lineData[1]=lineData[1].replace('\r','');
										  
										  //Initiate comparision same file check for duplocate data
										  var compData;
										  for(var line2 = 0; line2 < lines.length; line2++){
											  compData=lines[line2].split(',');//Get contents
											  if(compData.length!==2){//Check contents in line & set flag
												dataCheck=false;
											  }else{
												//Format data
												compData[1]=compData[1].replace('\n','');
												compData[1]=compData[1].replace('\r','');
												if(lineData[1]===compData[1] && line!==line2){//Check duplicates & set flag
													dataCheck=false;
												}
											  }
										  }
											
										  // Sanity check data
										  if(lineData.length!==2){// Contents check
											  dataCheck=false;
										  }else{
										  if((!regexEmail.test(lineData[1])) || (!regexName.test(lineData[0])) ){//Content format check
												dataCheck=false;
											
										    }
										  }
										}
										
										//If file contents ok procced to db duplicate check, upload and update
										if(dataCheck){
										
										 var disputeCount=0;//Count disputes
										  self.get('firebaseApp').database().ref('/addressbook/'+usid).once('value').then(function(snapshot) {//Check from firebase ** Ember data filter error hence done manually
										  
										  //Read the data
										  for( line = 0; line < lines.length; line++){
											
										  //Again get data and format it
										  lineData=lines[line].split(',');
										  lineData[1]=lineData[1].replace('\n','');
										  lineData[1]=lineData[1].replace('\r','');
										  
										  var validations=true;//Duplicate check validation flag
											for(var dataItem in snapshot.val()){//Go through DB items
												if(snapshot.val()[dataItem].email===lineData[1]){//If duplicate in DB raise flag and store dispute
														
														var dispute={
													    pushKey: dataItem,
														email:lineData[1],
														oldName:snapshot.val()[dataItem].name,
														newName:lineData[0],
														count:disputeCount//Track dispute item for modal
														};
													    disputedObj.push(dispute);//Store dipute
														disputeCount++;//Count dispute
														validations=false;//Raise flag
												}
												}
												if(validations){//If item doesnt have duplicates prepare storage item
												 var addrData	={
													 name:lineData[0],
													 email:lineData[1]
												 };
												 var DBKey = self.get('firebaseApp').database().ref().child('/addressbook/'+usid).push().key;//get unique key
												 
												  updates['/addressbook/'+usid+'/' + DBKey] = addrData;//Prepare update list
													
												}
											
										       }
											   
											   //Now upload undisputed items http://raadtech.blogspot.com.au/2013/02/how-to-do-online-bulk-uploads-for.html
											   self.get('firebaseApp').database().ref().update(updates);
											   
											   if( disputeCount>0){ //If dipute show dispute modal
												   self.set('disputedObj', disputedObj); 
												   document.getElementById('updateModal').style.display = "block";
											   }else{
												   //Else complete task
												   self.set('uploadLog', 'File upload completed.'); 
												   
											   }
										  
												}).catch(function(error){
													 self.set('uploadLog', ('Error: '+error.code + ' - '+ error.message)); //DB error
												 });
												 
												 
										  
										        
										        
												
										}else{
											self.set('uploadLog', 'Error: File contents corrupt.'); //File content error
										}
									  };
									  reader.readAsText(file);
								}else{
									self.set('uploadLog', 'Error: Invalid file format.'); //File extension error
								}
								
	
    },
	
   // update selected dispute items
   Update: function() {
	      var updates = {};//Intiate variable
		  var usid=this.get('firebaseApp').auth().currentUser.uid;//Get user id
		  var self=this;//Get current item 
		  
		  //Dispute objects
	      var disputedObj= self.get('disputedObj');
		  
			for(var obj=0;obj<disputedObj.length;obj++){//Got through select item list
				var contentVal= document.getElementById('dispute_'+obj).value;
				
				if(contentVal==="True"){//If item selected add to update list
					var addrData	={
					 name:disputedObj[obj].newName,
					 email:disputedObj[obj].email
							};
			    var DBKey = disputedObj[obj].pushKey;//Get DB key
												 
				updates['/addressbook/'+usid+'/' + DBKey] = addrData;//prepare updates
				}
				
			}
			 self.get('firebaseApp').database().ref().update(updates).then(function(){
				 
													 self.set('uploadLog', 'File upload completed.'); //Upload complete message
													 document.getElementById('updateModal').style.display = "none";
													 
												 }).catch(function(error){
													 self.set('uploadLog', ('Error: '+error.code + ' - '+ error.message)); //Error message
													 document.getElementById('updateModal').style.display = "none";
												 });
   }
  }
	
	
});
