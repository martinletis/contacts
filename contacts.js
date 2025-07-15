goog.module('com.martinletis.contacts');

goog.require('i18n.phonenumbers.PhoneNumberUtil');

const phoneNumberUtil = i18n.phonenumbers.PhoneNumberUtil.getInstance();

function stringify(connection) {
  if (connection['names']) {
    return connection['names'].map(name => name['displayName']).join(',');
  }
  if (connection['organizations']) {
    return connection['organizations'].map(organization => organization['name']).join(',');
  }
  return '';
}

function listConnections(tokenResponse, nextPageToken) {
  // https://developers.google.com/people/api/rest/v1/people.connections/list
  gapi.client.people.people.connections.list({
    'resourceName': 'people/me',
    'pageSize': 1000,
    'pageToken': nextPageToken,
    'personFields': ['names', 'organizations', 'phoneNumbers', 'addresses', 'birthdays'].join(','),
  })
    .then(response => response.result)
    .then(result => {
      console.debug(result);
      const table = document.getElementById('contacts');

      // TODO(martin.letis): global sort?
      result['connections'].sort((a,b) => stringify(a).localeCompare(stringify(b))).forEach(connection => {
        const row = table.insertRow();

        const name = document.createElement('a');
        name.appendChild(document.createTextNode(stringify(connection)));
        name.href = 'https://contacts.google.com/person/' + connection['resourceName'].split('/').at(-1);
        name.target = '_blank';
        row.insertCell().appendChild(name);

        const phoneNumbers = row.insertCell();
        if (connection['phoneNumbers']) {
          phoneNumbers.appendChild(document.createTextNode(connection['phoneNumbers'].map(phoneNumber => phoneNumber['value'])));
          connection['phoneNumbers'].forEach(phoneNumber => {
            const number = phoneNumber['value'];
            // Validation: value must start with '+'
            if (!number.startsWith('+')) {
              phoneNumbers.bgColor = '#ee9090';
            }

            // Validation: value must be a valid number
            const proto = phoneNumberUtil.parse(number);
            if (!phoneNumberUtil.isValidNumber(proto)) {
              phoneNumbers.bgColor = '#ee9090';
            }

            // Validation: international number format is stable
            if (number != phoneNumberUtil.format(proto, i18n.phonenumbers.PhoneNumberFormat.INTERNATIONAL)) {
              phoneNumbers.bgColor = '#ee9090';
            }
          });
        }

        const addresses = row.insertCell();
        if (connection['addresses']) {
          addresses.appendChild(document.createTextNode(connection['addresses'].map(address => address['formattedValue'])));
          connection['addresses'].forEach(address => {
            // Validation: streetAddress must not contain '\n'
            if (address['streetAddress'].includes('\n')) {
              addresses.bgColor = '#ee9090';
            }

            // Validation: extendedAddress is undefined
            if (address['extendedAddress']) {
              addresses.bgColor = '#ee9090';
            }

            // Validation: city is defined
            if (!address['city']) {
              addresses.bgColor = '#ee9090';
            }

            // Validation: italian address does not start with a number
            if (address['country']=='IT' && address['streetAddress'].match(/^\d/)) {
              addresses.bgColor = '#ee9090';
            }
          });
        }

        const birthdays = row.insertCell();
        if (connection['birthdays']) {
          birthdays.appendChild(document.createTextNode(connection['birthdays'].filter(birthday => birthday['date']).map(
            birthday => new Date(birthday['date']['year'], birthday['date']['month'], birthday['date']['day']).toDateString())));
          connection['birthdays'].forEach(birthday => {
            if (!birthday['date']) {
              birthdays.bgColor = '#ee9090';
            }
          });
        }
      });
      if (result['nextPageToken']) {
        listConnections(tokenResponse, result['nextPageToken']);
      }
    });
}

function initAuth() {
  const client = google.accounts.oauth2.initTokenClient({
    'client_id': '927409904390-9tidmge2ih2brcffsmt41t82knnucss4.apps.googleusercontent.com',
    'scope': 'https://www.googleapis.com/auth/contacts.readonly',
    'callback': listConnections,
    'prompt': '',
    'error_callback': error => console.warn(JSON.stringify(error)),
  });
  
  client.requestAccessToken();
} 

function initGapi() {
  gapi.client.init({
    'discoveryDocs': ['https://people.googleapis.com/$discovery/rest?version=v1'],
  }).then(initAuth);
}

gapi.load('client', initGapi);
