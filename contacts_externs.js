/** @externs */
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