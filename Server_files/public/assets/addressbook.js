"use strict";

/* jshint ignore:start */



/* jshint ignore:end */

define('addressbook/adapters/application', ['exports', 'emberfire/adapters/firebase'], function (exports, _emberfireAdaptersFirebase) {
  // By Badruddin Kamal

  exports['default'] = _emberfireAdaptersFirebase['default'].extend({});
});
define('addressbook/app', ['exports', 'ember', 'addressbook/resolver', 'ember-load-initializers', 'addressbook/config/environment'], function (exports, _ember, _addressbookResolver, _emberLoadInitializers, _addressbookConfigEnvironment) {

  var App = undefined;

  _ember['default'].MODEL_FACTORY_INJECTIONS = true;

  App = _ember['default'].Application.extend({
    modulePrefix: _addressbookConfigEnvironment['default'].modulePrefix,
    podModulePrefix: _addressbookConfigEnvironment['default'].podModulePrefix,
    Resolver: _addressbookResolver['default']
  });

  (0, _emberLoadInitializers['default'])(App, _addressbookConfigEnvironment['default'].modulePrefix);

  exports['default'] = App;
});
define('addressbook/components/app-version', ['exports', 'ember-cli-app-version/components/app-version', 'addressbook/config/environment'], function (exports, _emberCliAppVersionComponentsAppVersion, _addressbookConfigEnvironment) {

  var name = _addressbookConfigEnvironment['default'].APP.name;
  var version = _addressbookConfigEnvironment['default'].APP.version;

  exports['default'] = _emberCliAppVersionComponentsAppVersion['default'].extend({
    version: version,
    name: name
  });
});
define('addressbook/components/torii-iframe-placeholder', ['exports', 'torii/components/torii-iframe-placeholder'], function (exports, _toriiComponentsToriiIframePlaceholder) {
  exports['default'] = _toriiComponentsToriiIframePlaceholder['default'];
});
define('addressbook/controllers/upload', ['exports', 'ember'], function (exports, _ember) {
	// By Badruddin Kamal

	exports['default'] = _ember['default'].Controller.extend({
		firebaseApp: _ember['default'].inject.service(), //Inject firebase
		actions: {

			//On file upload
			UploadFile: function UploadFile() {
				var usid = this.get('firebaseApp').auth().currentUser.uid; //Get usser id

				// Get file item
				var fileobj = document.getElementById("UploadFileItem"); // Get file
				var file = fileobj.files[0]; //Process file
				var ext = file.name.split('.'); //Extract file name
				var self = this; //Remember object reference

				self.set('uploadLog', 'Loading please wait.....'); //Set out put

				// Read file
				if ("csv" === ext[ext.length - 1]) {
					//If file format correct

					//Regex for name and email
					var regexEmail = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
					var regexName = /^[a-zA-Z ]{2,30}$/;
					var reader = new FileReader(); //Initialize file reader

					//Initialize values
					var disputedObj = [];
					var updates = {};

					reader.onload = function () {
						//Read file
						//Initialize variables
						var dataCheck = true; //Data sanity check flag
						var lineData;

						//Read By lines
						var lines = this.result.split('\n');
						for (var line = 0; line < lines.length; line++) {

							lineData = lines[line].split(','); //Get contents

							//Remove CR LF
							lineData[1] = lineData[1].replace('\n', '');
							lineData[1] = lineData[1].replace('\r', '');

							//Initiate comparision same file check for duplocate data
							var compData;
							for (var line2 = 0; line2 < lines.length; line2++) {
								compData = lines[line2].split(','); //Get contents
								if (compData.length !== 2) {
									//Check contents in line & set flag
									dataCheck = false;
								} else {
									//Format data
									compData[1] = compData[1].replace('\n', '');
									compData[1] = compData[1].replace('\r', '');
									if (lineData[1] === compData[1] && line !== line2) {
										//Check duplicates & set flag
										dataCheck = false;
									}
								}
							}

							// Sanity check data
							if (lineData.length !== 2) {
								// Contents check
								dataCheck = false;
							} else {
								if (!regexEmail.test(lineData[1]) || !regexName.test(lineData[0])) {
									//Content format check
									dataCheck = false;
								}
							}
						}

						//If file contents ok procced to db duplicate check, upload and update
						if (dataCheck) {

							var disputeCount = 0; //Count disputes
							self.get('firebaseApp').database().ref('/addressbook/' + usid).once('value').then(function (snapshot) {
								//Check from firebase ** Ember data filter error hence done manually

								//Read the data
								for (line = 0; line < lines.length; line++) {

									//Again get data and format it
									lineData = lines[line].split(',');
									lineData[1] = lineData[1].replace('\n', '');
									lineData[1] = lineData[1].replace('\r', '');

									var validations = true; //Duplicate check validation flag
									for (var dataItem in snapshot.val()) {
										//Go through DB items
										if (snapshot.val()[dataItem].email === lineData[1]) {
											//If duplicate in DB raise flag and store dispute

											var dispute = {
												pushKey: dataItem,
												email: lineData[1],
												oldName: snapshot.val()[dataItem].name,
												newName: lineData[0],
												count: disputeCount //Track dispute item for modal
											};
											disputedObj.push(dispute); //Store dipute
											disputeCount++; //Count dispute
											validations = false; //Raise flag
										}
									}
									if (validations) {
										//If item doesnt have duplicates prepare storage item
										var addrData = {
											name: lineData[0],
											email: lineData[1]
										};
										var DBKey = self.get('firebaseApp').database().ref().child('/addressbook/' + usid).push().key; //get unique key

										updates['/addressbook/' + usid + '/' + DBKey] = addrData; //Prepare update list
									}
								}

								//Now upload undisputed items http://raadtech.blogspot.com.au/2013/02/how-to-do-online-bulk-uploads-for.html
								self.get('firebaseApp').database().ref().update(updates);

								if (disputeCount > 0) {
									//If dipute show dispute modal
									self.set('disputedObj', disputedObj);
									document.getElementById('updateModal').style.display = "block";
								} else {
									//Else complete task
									self.set('uploadLog', 'File upload completed.');
								}
							})['catch'](function (error) {
								self.set('uploadLog', 'Error: ' + error.code + ' - ' + error.message); //DB error
							});
						} else {
								self.set('uploadLog', 'Error: File contents corrupt.'); //File content error
							}
					};
					reader.readAsText(file);
				} else {
					self.set('uploadLog', 'Error: Invalid file format.'); //File extension error
				}
			},

			// update selected dispute items
			Update: function Update() {
				var updates = {}; //Intiate variable
				var usid = this.get('firebaseApp').auth().currentUser.uid; //Get user id
				var self = this; //Get current item

				//Dispute objects
				var disputedObj = self.get('disputedObj');

				for (var obj = 0; obj < disputedObj.length; obj++) {
					//Got through select item list
					var contentVal = document.getElementById('dispute_' + obj).value;

					if (contentVal === "True") {
						//If item selected add to update list
						var addrData = {
							name: disputedObj[obj].newName,
							email: disputedObj[obj].email
						};
						var DBKey = disputedObj[obj].pushKey; //Get DB key

						updates['/addressbook/' + usid + '/' + DBKey] = addrData; //prepare updates
					}
				}
				self.get('firebaseApp').database().ref().update(updates).then(function () {

					self.set('uploadLog', 'File upload completed.'); //Upload complete message
					document.getElementById('updateModal').style.display = "none";
				})['catch'](function (error) {
					self.set('uploadLog', 'Error: ' + error.code + ' - ' + error.message); //Error message
					document.getElementById('updateModal').style.display = "none";
				});
			}
		}

	});
});
define('addressbook/helpers/pluralize', ['exports', 'ember-inflector/lib/helpers/pluralize'], function (exports, _emberInflectorLibHelpersPluralize) {
  exports['default'] = _emberInflectorLibHelpersPluralize['default'];
});
define('addressbook/helpers/singularize', ['exports', 'ember-inflector/lib/helpers/singularize'], function (exports, _emberInflectorLibHelpersSingularize) {
  exports['default'] = _emberInflectorLibHelpersSingularize['default'];
});
define('addressbook/initializers/app-version', ['exports', 'ember-cli-app-version/initializer-factory', 'addressbook/config/environment'], function (exports, _emberCliAppVersionInitializerFactory, _addressbookConfigEnvironment) {
  exports['default'] = {
    name: 'App Version',
    initialize: (0, _emberCliAppVersionInitializerFactory['default'])(_addressbookConfigEnvironment['default'].APP.name, _addressbookConfigEnvironment['default'].APP.version)
  };
});
define('addressbook/initializers/container-debug-adapter', ['exports', 'ember-resolver/container-debug-adapter'], function (exports, _emberResolverContainerDebugAdapter) {
  exports['default'] = {
    name: 'container-debug-adapter',

    initialize: function initialize() {
      var app = arguments[1] || arguments[0];

      app.register('container-debug-adapter:main', _emberResolverContainerDebugAdapter['default']);
      app.inject('container-debug-adapter:main', 'namespace', 'application:main');
    }
  };
});
define('addressbook/initializers/data-adapter', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `data-adapter` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'data-adapter',
    before: 'store',
    initialize: _ember['default'].K
  };
});
define('addressbook/initializers/ember-data', ['exports', 'ember-data/setup-container', 'ember-data/-private/core'], function (exports, _emberDataSetupContainer, _emberDataPrivateCore) {

  /*
  
    This code initializes Ember-Data onto an Ember application.
  
    If an Ember.js developer defines a subclass of DS.Store on their application,
    as `App.StoreService` (or via a module system that resolves to `service:store`)
    this code will automatically instantiate it and make it available on the
    router.
  
    Additionally, after an application's controllers have been injected, they will
    each have the store made available to them.
  
    For example, imagine an Ember.js application with the following classes:
  
    App.StoreService = DS.Store.extend({
      adapter: 'custom'
    });
  
    App.PostsController = Ember.ArrayController.extend({
      // ...
    });
  
    When the application is initialized, `App.ApplicationStore` will automatically be
    instantiated, and the instance of `App.PostsController` will have its `store`
    property set to that instance.
  
    Note that this code will only be run if the `ember-application` package is
    loaded. If Ember Data is being used in an environment other than a
    typical application (e.g., node.js where only `ember-runtime` is available),
    this code will be ignored.
  */

  exports['default'] = {
    name: 'ember-data',
    initialize: _emberDataSetupContainer['default']
  };
});
define('addressbook/initializers/emberfire', ['exports', 'emberfire/initializers/emberfire'], function (exports, _emberfireInitializersEmberfire) {
  exports['default'] = _emberfireInitializersEmberfire['default'];
});
define('addressbook/initializers/export-application-global', ['exports', 'ember', 'addressbook/config/environment'], function (exports, _ember, _addressbookConfigEnvironment) {
  exports.initialize = initialize;

  function initialize() {
    var application = arguments[1] || arguments[0];
    if (_addressbookConfigEnvironment['default'].exportApplicationGlobal !== false) {
      var value = _addressbookConfigEnvironment['default'].exportApplicationGlobal;
      var globalName;

      if (typeof value === 'string') {
        globalName = value;
      } else {
        globalName = _ember['default'].String.classify(_addressbookConfigEnvironment['default'].modulePrefix);
      }

      if (!window[globalName]) {
        window[globalName] = application;

        application.reopen({
          willDestroy: function willDestroy() {
            this._super.apply(this, arguments);
            delete window[globalName];
          }
        });
      }
    }
  }

  exports['default'] = {
    name: 'export-application-global',

    initialize: initialize
  };
});
define('addressbook/initializers/initialize-torii-callback', ['exports', 'torii/redirect-handler'], function (exports, _toriiRedirectHandler) {
  exports['default'] = {
    name: 'torii-callback',
    before: 'torii',
    initialize: function initialize(application) {
      if (arguments[1]) {
        // Ember < 2.1
        application = arguments[1];
      }
      application.deferReadiness();
      _toriiRedirectHandler['default'].handle(window)['catch'](function () {
        application.advanceReadiness();
      });
    }
  };
});
define('addressbook/initializers/initialize-torii-session', ['exports', 'torii/bootstrap/session', 'torii/configuration'], function (exports, _toriiBootstrapSession, _toriiConfiguration) {
  exports['default'] = {
    name: 'torii-session',
    after: 'torii',

    initialize: function initialize(application) {
      if (arguments[1]) {
        // Ember < 2.1
        application = arguments[1];
      }
      var configuration = (0, _toriiConfiguration.getConfiguration)();
      if (!configuration.sessionServiceName) {
        return;
      }

      (0, _toriiBootstrapSession['default'])(application, configuration.sessionServiceName);

      var sessionFactoryName = 'service:' + configuration.sessionServiceName;
      application.inject('adapter', configuration.sessionServiceName, sessionFactoryName);
    }
  };
});
define('addressbook/initializers/initialize-torii', ['exports', 'torii/bootstrap/torii', 'torii/configuration', 'addressbook/config/environment'], function (exports, _toriiBootstrapTorii, _toriiConfiguration, _addressbookConfigEnvironment) {

  var initializer = {
    name: 'torii',
    initialize: function initialize(application) {
      if (arguments[1]) {
        // Ember < 2.1
        application = arguments[1];
      }
      (0, _toriiConfiguration.configure)(_addressbookConfigEnvironment['default'].torii || {});
      (0, _toriiBootstrapTorii['default'])(application);
      application.inject('route', 'torii', 'service:torii');
    }
  };

  exports['default'] = initializer;
});
define('addressbook/initializers/injectStore', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `injectStore` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'injectStore',
    before: 'store',
    initialize: _ember['default'].K
  };
});
define('addressbook/initializers/store', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `store` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'store',
    after: 'ember-data',
    initialize: _ember['default'].K
  };
});
define('addressbook/initializers/transforms', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `transforms` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'transforms',
    before: 'store',
    initialize: _ember['default'].K
  };
});
define("addressbook/instance-initializers/ember-data", ["exports", "ember-data/-private/instance-initializers/initialize-store-service"], function (exports, _emberDataPrivateInstanceInitializersInitializeStoreService) {
  exports["default"] = {
    name: "ember-data",
    initialize: _emberDataPrivateInstanceInitializersInitializeStoreService["default"]
  };
});
define('addressbook/instance-initializers/setup-routes', ['exports', 'torii/bootstrap/routing', 'torii/configuration', 'torii/router-dsl-ext'], function (exports, _toriiBootstrapRouting, _toriiConfiguration, _toriiRouterDslExt) {
  exports['default'] = {
    name: 'torii-setup-routes',
    initialize: function initialize(applicationInstance, registry) {
      var configuration = (0, _toriiConfiguration.getConfiguration)();

      if (!configuration.sessionServiceName) {
        return;
      }

      var router = applicationInstance.get('router');
      var setupRoutes = function setupRoutes() {
        var authenticatedRoutes = router.router.authenticatedRoutes;
        var hasAuthenticatedRoutes = !Ember.isEmpty(authenticatedRoutes);
        if (hasAuthenticatedRoutes) {
          (0, _toriiBootstrapRouting['default'])(applicationInstance, authenticatedRoutes);
        }
        router.off('willTransition', setupRoutes);
      };
      router.on('willTransition', setupRoutes);
    }
  };
});
define('addressbook/instance-initializers/walk-providers', ['exports', 'torii/lib/container-utils', 'torii/configuration'], function (exports, _toriiLibContainerUtils, _toriiConfiguration) {
  exports['default'] = {
    name: 'torii-walk-providers',
    initialize: function initialize(applicationInstance) {
      var configuration = (0, _toriiConfiguration.getConfiguration)();
      // Walk all configured providers and eagerly instantiate
      // them. This gives providers with initialization side effects
      // like facebook-connect a chance to load up assets.
      for (var key in configuration.providers) {
        if (configuration.providers.hasOwnProperty(key)) {
          (0, _toriiLibContainerUtils.lookup)(applicationInstance, 'torii-provider:' + key);
        }
      }
    }
  };
});
define('addressbook/models/contact', ['exports', 'ember-data'], function (exports, _emberData) {
  // By Badruddin Kamal

  // Store data model for client data
  exports['default'] = _emberData['default'].Model.extend({
    name: _emberData['default'].attr('string'),
    email: _emberData['default'].attr('string')
  });
});
define('addressbook/resolver', ['exports', 'ember-resolver'], function (exports, _emberResolver) {
  exports['default'] = _emberResolver['default'];
});
define('addressbook/router', ['exports', 'ember', 'addressbook/config/environment'], function (exports, _ember, _addressbookConfigEnvironment) {
  // By Badruddin Kamal

  var Router = _ember['default'].Router.extend({
    location: _addressbookConfigEnvironment['default'].locationType,
    rootURL: _addressbookConfigEnvironment['default'].rootURL
  });

  Router.map(function () {
    this.route('upload');
    this.route('history');
  });

  exports['default'] = Router;
});
define('addressbook/routes/application', ['exports', 'ember'], function (exports, _ember) {
  // By Badruddin Kamal
  //Taken from ember fire https://github.com/firebase/emberfire

  exports['default'] = _ember['default'].Route.extend({
    beforeModel: function beforeModel() {
      var user = this.get('firebaseApp').auth().currentUser; //Get user
      if (user) {
        //If session authenticated always goto upload
        if (window.location.pathname === '/') {
          window.location.replace('/upload');
        }
      }
      return this.get('session').fetch()['catch'](function () {}); // Get session variable for view
    },
    firebaseApp: _ember['default'].inject.service(), //Inject firebase
    actions: {
      //On sign in
      signIn: function signIn(provider) {
        this.get('session').open('firebase', { provider: provider }).then(function () {//Signin by firebase
        })['catch'](function (error) {
          document.getElementById('LoginLog').innerHTML = error.code + ' - ' + error.message;
        });
      },
      // On sign out
      signOut: function signOut() {
        this.get('session').close()['catch'](function (error) {
          //Signout by firebase
          document.getElementById('LoginLog').innerHTML = error.code + ' - ' + error.message;
        });
      }
    }
  });
});
define('addressbook/routes/history', ['exports', 'ember'], function (exports, _ember) {
	// By Badruddin Kamal

	exports['default'] = _ember['default'].Route.extend({
		firebaseApp: _ember['default'].inject.service(), //Inject firebase
		model: function model() {
			var usid = this.get('firebaseApp').auth().currentUser.uid; //Get user id
			var self = this; // remmeber current object

			//Call DB data ** ember data error with query so data mgmt done manually
			this.get('firebaseApp').database().ref('/addressbook/' + usid + '/').once('value').then(function (snapshot) {

				//For each db value store it in client model
				for (var contactKey in snapshot.val()) {

					self.store.createRecord('contact', {
						name: snapshot.val()[contactKey].name,
						email: snapshot.val()[contactKey].email
					});
				}
			});
			//Return client model for display
			return self.store.findAll('contact');
		}

	});
});
define('addressbook/routes/upload', ['exports', 'ember'], function (exports, _ember) {
  // By Badruddin Kamal

  exports['default'] = _ember['default'].Route.extend({});
});
define('addressbook/services/ajax', ['exports', 'ember-ajax/services/ajax'], function (exports, _emberAjaxServicesAjax) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _emberAjaxServicesAjax['default'];
    }
  });
});
define('addressbook/services/firebase-app', ['exports', 'emberfire/services/firebase-app'], function (exports, _emberfireServicesFirebaseApp) {
  exports['default'] = _emberfireServicesFirebaseApp['default'];
});
define('addressbook/services/firebase', ['exports', 'emberfire/services/firebase'], function (exports, _emberfireServicesFirebase) {
  exports['default'] = _emberfireServicesFirebase['default'];
});
define('addressbook/services/popup', ['exports', 'torii/services/popup'], function (exports, _toriiServicesPopup) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _toriiServicesPopup['default'];
    }
  });
});
define('addressbook/services/torii-session', ['exports', 'torii/services/session'], function (exports, _toriiServicesSession) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _toriiServicesSession['default'];
    }
  });
});
define('addressbook/services/torii', ['exports', 'torii/services/torii'], function (exports, _toriiServicesTorii) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _toriiServicesTorii['default'];
    }
  });
});
define("addressbook/templates/application", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      return {
        meta: {
          "revision": "Ember@2.8.1",
          "loc": {
            "source": null,
            "start": {
              "line": 3,
              "column": 0
            },
            "end": {
              "line": 25,
              "column": 0
            }
          },
          "moduleName": "addressbook/templates/application.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment(" if user signed in display menu and login info ");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("nav");
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("ul");
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("Logged in as ");
          dom.appendChild(el4, el5);
          var el5 = dom.createComment("");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          dom.setAttribute(el4, "id", "LoginLog");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("button");
          var el5 = dom.createTextNode("Sign out");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("Menu List");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("a");
          dom.setAttribute(el4, "href", "/upload");
          var el5 = dom.createTextNode("Upload a File");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n	");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("p");
          var el5 = dom.createTextNode("   ");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n    ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("li");
          var el4 = dom.createElement("a");
          dom.setAttribute(el4, "href", "/history");
          var el5 = dom.createTextNode("Address-Book");
          dom.appendChild(el4, el5);
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n  ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("article");
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var element1 = dom.childAt(fragment, [2, 1]);
          var element2 = dom.childAt(element1, [7, 0]);
          var morphs = new Array(3);
          morphs[0] = dom.createMorphAt(dom.childAt(element1, [1, 0]), 1, 1);
          morphs[1] = dom.createElementMorph(element2);
          morphs[2] = dom.createMorphAt(dom.childAt(fragment, [4]), 1, 1);
          return morphs;
        },
        statements: [["content", "session.currentUser.displayName", ["loc", [null, [7, 21], [7, 56]]], 0, 0, 0, 0], ["element", "action", ["signOut"], [], ["loc", [null, [10, 13], [10, 33]]], 0, 0], ["content", "outlet", ["loc", [null, [23, 2], [23, 12]]], 0, 0, 0, 0]],
        locals: [],
        templates: []
      };
    })();
    var child1 = (function () {
      return {
        meta: {
          "revision": "Ember@2.8.1",
          "loc": {
            "source": null,
            "start": {
              "line": 25,
              "column": 0
            },
            "end": {
              "line": 31,
              "column": 0
            }
          },
          "moduleName": "addressbook/templates/application.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createComment(" if user not signed display google login button ");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("article");
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("p");
          dom.setAttribute(el2, "id", "LoginLog");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("button");
          var el3 = dom.createTextNode("Sign in with Google");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var element0 = dom.childAt(fragment, [2, 3]);
          var morphs = new Array(1);
          morphs[0] = dom.createElementMorph(element0);
          return morphs;
        },
        statements: [["element", "action", ["signIn", "google"], [], ["loc", [null, [29, 10], [29, 38]]], 0, 0]],
        locals: [],
        templates: []
      };
    })();
    return {
      meta: {
        "revision": "Ember@2.8.1",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 32,
            "column": 0
          }
        },
        "moduleName": "addressbook/templates/application.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment(" home page ");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(1);
        morphs[0] = dom.createMorphAt(fragment, 2, 2, contextualElement);
        dom.insertBoundary(fragment, null);
        return morphs;
      },
      statements: [["block", "if", [["get", "session.isAuthenticated", ["loc", [null, [3, 6], [3, 29]]], 0, 0, 0, 0]], [], 0, 1, ["loc", [null, [3, 0], [31, 7]]]]],
      locals: [],
      templates: [child0, child1]
    };
  })());
});
define("addressbook/templates/history", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      return {
        meta: {
          "revision": "Ember@2.8.1",
          "loc": {
            "source": null,
            "start": {
              "line": 9,
              "column": 4
            },
            "end": {
              "line": 14,
              "column": 1
            }
          },
          "moduleName": "addressbook/templates/history.hbs"
        },
        isEmpty: false,
        arity: 1,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("	     ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("tr");
          var el2 = dom.createTextNode("\n			");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("td");
          var el3 = dom.createElement("p");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n			");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("td");
          var el3 = dom.createElement("p");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n		  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var element0 = dom.childAt(fragment, [1]);
          var morphs = new Array(2);
          morphs[0] = dom.createMorphAt(dom.childAt(element0, [1, 0]), 0, 0);
          morphs[1] = dom.createMorphAt(dom.childAt(element0, [3, 0]), 0, 0);
          return morphs;
        },
        statements: [["content", "contact.name", ["loc", [null, [11, 10], [11, 26]]], 0, 0, 0, 0], ["content", "contact.email", ["loc", [null, [12, 10], [12, 27]]], 0, 0, 0, 0]],
        locals: ["contact"],
        templates: []
      };
    })();
    return {
      meta: {
        "revision": "Ember@2.8.1",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 17,
            "column": 0
          }
        },
        "moduleName": "addressbook/templates/history.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment(" Display all contacts ");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("table");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("tr");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("th");
        var el4 = dom.createElement("h2");
        var el5 = dom.createTextNode("Name");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("th");
        var el4 = dom.createElement("h2");
        var el5 = dom.createTextNode("Email");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment(" display history content ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(2);
        morphs[0] = dom.createMorphAt(dom.childAt(fragment, [2]), 5, 5);
        morphs[1] = dom.createMorphAt(fragment, 4, 4, contextualElement);
        return morphs;
      },
      statements: [["block", "each", [["get", "model", ["loc", [null, [9, 12], [9, 17]]], 0, 0, 0, 0]], [], 0, null, ["loc", [null, [9, 4], [14, 10]]]], ["content", "outlet", ["loc", [null, [16, 0], [16, 10]]], 0, 0, 0, 0]],
      locals: [],
      templates: [child0]
    };
  })());
});
define("addressbook/templates/upload", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      return {
        meta: {
          "revision": "Ember@2.8.1",
          "loc": {
            "source": null,
            "start": {
              "line": 28,
              "column": 1
            },
            "end": {
              "line": 31,
              "column": 1
            }
          },
          "moduleName": "addressbook/templates/upload.hbs"
        },
        isEmpty: false,
        arity: 1,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("	   ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("p");
          var el2 = dom.createElement("input");
          dom.setAttribute(el2, "type", "checkbox");
          dom.setAttribute(el2, "value", "True");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" For ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" , name ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode(" with ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode(" ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("br");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n	   \n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var element0 = dom.childAt(fragment, [1]);
          var element1 = dom.childAt(element0, [0]);
          var morphs = new Array(4);
          morphs[0] = dom.createAttrMorph(element1, 'id');
          morphs[1] = dom.createMorphAt(element0, 2, 2);
          morphs[2] = dom.createMorphAt(element0, 4, 4);
          morphs[3] = dom.createMorphAt(element0, 6, 6);
          return morphs;
        },
        statements: [["attribute", "id", ["concat", ["dispute_", ["get", "dispute.count", ["loc", [null, [29, 44], [29, 57]]], 0, 0, 0, 0]], 0, 0, 0, 0, 0], 0, 0, 0, 0], ["content", "dispute.email", ["loc", [null, [29, 79], [29, 96]]], 0, 0, 0, 0], ["content", "dispute.oldName", ["loc", [null, [29, 104], [29, 123]]], 0, 0, 0, 0], ["content", "dispute.newName", ["loc", [null, [29, 129], [29, 148]]], 0, 0, 0, 0]],
        locals: ["dispute"],
        templates: []
      };
    })();
    return {
      meta: {
        "revision": "Ember@2.8.1",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 40,
            "column": 0
          }
        },
        "moduleName": "addressbook/templates/upload.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("Upload Page");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n\n\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("h2");
        var el2 = dom.createTextNode("Upload File(Only *.csv supported)");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        var el2 = dom.createTextNode("File format per line should be a unique: name,email (Also duplicate entries within file not supported)");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("br");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("br");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n  ");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("p");
        var el2 = dom.createTextNode("  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n    ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        var el3 = dom.createTextNode("Upload File");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("br");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n\n\n\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("Modal for data Update from w3schools");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "updateModal");
        dom.setAttribute(el1, "class", "modal");
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment(" Modal content ");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "modal-content");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("span");
        dom.setAttribute(el3, "class", "close");
        dom.setAttribute(el3, "onclick", "document.getElementById('updateModal').style.display = 'none'");
        var el4 = dom.createTextNode("×");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("section");
        var el4 = dom.createTextNode("\n	");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("h2");
        var el5 = dom.createTextNode("Select the contact details you wish to update and press the button below");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n");
        dom.appendChild(el3, el4);
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("	\n	");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("button");
        var el5 = dom.createTextNode("Update Selected");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n	");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n ");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element2 = dom.childAt(fragment, [12]);
        var element3 = dom.childAt(element2, [3]);
        var element4 = dom.childAt(fragment, [18, 3, 3]);
        var element5 = dom.childAt(element4, [5]);
        var morphs = new Array(6);
        morphs[0] = dom.createMorphAt(dom.childAt(fragment, [8]), 0, 0);
        morphs[1] = dom.createMorphAt(element2, 1, 1);
        morphs[2] = dom.createElementMorph(element3);
        morphs[3] = dom.createMorphAt(element4, 3, 3);
        morphs[4] = dom.createElementMorph(element5);
        morphs[5] = dom.createMorphAt(fragment, 20, 20, contextualElement);
        return morphs;
      },
      statements: [["content", "uploadLog", ["loc", [null, [9, 3], [9, 16]]], 0, 0, 0, 0], ["inline", "input", [], ["id", "UploadFileItem", "type", "file"], ["loc", [null, [11, 7], [11, 48]]], 0, 0], ["element", "action", ["UploadFile"], [], ["loc", [null, [13, 12], [13, 35]]], 0, 0], ["block", "each", [["get", "disputedObj", ["loc", [null, [28, 9], [28, 20]]], 0, 0, 0, 0]], [], 0, null, ["loc", [null, [28, 1], [31, 10]]]], ["element", "action", ["Update"], [], ["loc", [null, [33, 9], [33, 28]]], 0, 0], ["content", "outlet", ["loc", [null, [39, 0], [39, 10]]], 0, 0, 0, 0]],
      locals: [],
      templates: [child0]
    };
  })());
});
define('addressbook/torii-adapters/application', ['exports', 'emberfire/torii-adapters/firebase'], function (exports, _emberfireToriiAdaptersFirebase) {
  // By Badruddin Kamal

  exports['default'] = _emberfireToriiAdaptersFirebase['default'].extend({});
});
define('addressbook/torii-providers/firebase', ['exports', 'emberfire/torii-providers/firebase'], function (exports, _emberfireToriiProvidersFirebase) {
  exports['default'] = _emberfireToriiProvidersFirebase['default'];
});
/* jshint ignore:start */



/* jshint ignore:end */

/* jshint ignore:start */

define('addressbook/config/environment', ['ember'], function(Ember) {
  var prefix = 'addressbook';
/* jshint ignore:start */

try {
  var metaName = prefix + '/config/environment';
  var rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
  var config = JSON.parse(unescape(rawConfig));

  var exports = { 'default': config };

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

/* jshint ignore:end */

});

/* jshint ignore:end */

/* jshint ignore:start */

if (!runningTests) {
  require("addressbook/app")["default"].create({"name":"addressbook","version":"1.0.0+186374a4"});
}

/* jshint ignore:end */
//# sourceMappingURL=addressbook.map