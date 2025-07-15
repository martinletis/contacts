/** @externs */
function gapi() {}
gapi.load = function(libraries, callbackOrConfig) {};
gapi.client = function() {};
gapi.client.init = function(args) {};

gapi.client.people = function() {};
gapi.client.people.people = function() {};
gapi.client.people.people.connections = function() {};
gapi.client.people.people.connections.list = function(args) {};

google.accounts.oauth2.initTokenClient = function(config) {};

class TokenClient {
  requestAccessToken() {}
}

google.accounts.oauth2.TokenResponse = class {
  constructor() {
    this.expires_in;
    this.access_token;
  }
};